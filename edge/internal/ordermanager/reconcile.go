package ordermanager

import (
	"context"
	"fmt"
	"log"
	"math"
	"time"

	"gidh-intraday/edge/internal/broker"
)

func (m *Manager) reconcileLoop(ctx context.Context) {
	ticker := time.NewTicker(m.config.ReconcileInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			reconcileCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
			if err := m.Reconcile(reconcileCtx); err != nil {
				log.Printf("[ORDER MANAGER] reconciliation: %v", err)
			}
			cancel()
		}
	}
}

func (m *Manager) Reconcile(ctx context.Context) error {
	orders, err := m.store.ListOrders(ctx)
	if err != nil {
		return err
	}
	var firstErr error
	brokerOrders, brokerListErr := m.broker.GetOrders(ctx)
	byTag := make(map[string]broker.BrokerOrder, len(brokerOrders))
	for _, brokerOrder := range brokerOrders {
		if brokerOrder.Tag != "" {
			byTag[brokerOrder.Tag] = brokerOrder
		}
	}
	if brokerListErr != nil {
		firstErr = brokerListErr
	}
	for _, order := range orders {
		if terminal(order.Status) {
			continue
		}
		if order.Status == StatusPending {
			continue
		}
		if order.BrokerOrderID == "" {
			discovered, ok := byTag[order.BrokerTag]
			if !ok {
				if order.Status == StatusTriggering {
					reset, resetErr := m.store.Transition(ctx, order, StatusPending, func(next *ManagedOrder) {
						next.RejectionReason = ""
					})
					if resetErr == nil {
						_ = m.index.addPending(ctx, reset.InstrumentToken, reset.ID)
					} else if firstErr == nil {
						firstErr = resetErr
					}
				} else if order.Status == StatusSubmitting && time.Since(order.UpdatedAt) >= 15*time.Second {
					_, transitionErr := m.store.Transition(ctx, order, StatusReconcileRequired, func(next *ManagedOrder) {
						next.RejectionReason = "submission outcome is unknown; broker reconciliation required"
					})
					if transitionErr != nil && firstErr == nil {
						firstErr = transitionErr
					}
				}
				continue
			}
			nextStatus := StatusSubmitted
			if order.IsExit {
				nextStatus = StatusExitSubmitted
			}
			order, err = m.store.Transition(ctx, order, nextStatus, func(next *ManagedOrder) {
				next.BrokerOrderID = discovered.OrderID
			})
			if err != nil {
				if firstErr == nil {
					firstErr = err
				}
				continue
			}
		}
		brokerOrder, getErr := m.broker.GetOrder(ctx, order.BrokerOrderID)
		if getErr != nil {
			if firstErr == nil {
				firstErr = fmt.Errorf("reconcile %s: %w", order.ID, getErr)
			}
			continue
		}
		if order.IsExit {
			if brokerOrder.Status == "COMPLETE" {
				position, positionErr := m.store.GetPosition(ctx, order.Symbol)
				if positionErr == nil {
					_, getErr = m.applyExitFill(ctx, order, position, brokerOrder)
				}
			} else if brokerOrder.Status == "REJECTED" || brokerOrder.Status == "CANCELLED" {
				_, getErr = m.store.Transition(ctx, order, StatusRejected, func(next *ManagedOrder) {
					next.RejectionReason = brokerOrder.StatusMessage
				})
				if getErr == nil {
					_ = m.store.ReleasePositionExit(ctx, order.Symbol)
				}
			}
		} else {
			_, getErr = m.applyBrokerEntryStatus(ctx, order, brokerOrder)
		}
		if getErr != nil && firstErr == nil {
			firstErr = getErr
		}
	}
	if m.config.LiveExecution {
		if positionErr := m.reconcilePositions(ctx); positionErr != nil && firstErr == nil {
			firstErr = positionErr
		}
	}
	return firstErr
}

func (m *Manager) reconcilePositions(ctx context.Context) error {
	brokerPositions, err := m.broker.GetPositions(ctx)
	if err != nil {
		return fmt.Errorf("fetch broker positions: %w", err)
	}
	localPositions, err := m.store.ListPositions(ctx)
	if err != nil {
		return err
	}
	localBySymbol := make(map[string]*ActivePosition, len(localPositions))
	for _, position := range localPositions {
		localBySymbol[position.Symbol] = position
	}
	seen := make(map[string]struct{}, len(brokerPositions))
	for _, brokerPosition := range brokerPositions {
		seen[brokerPosition.Symbol] = struct{}{}
		side := SideLong
		if brokerPosition.Quantity < 0 {
			side = SideShort
		}
		quantity := int(math.Abs(float64(brokerPosition.Quantity)))
		stop, target := fixedLevels(side, brokerPosition.AveragePrice)
		position := localBySymbol[brokerPosition.Symbol]
		eventType := "POSITION_UPDATED"
		if position == nil {
			eventType = "POSITION_OPENED"
			position = &ActivePosition{
				Symbol: brokerPosition.Symbol, OpenedAt: time.Now(),
				Invalidation: "BROKER_DISCOVERED", BrokerOrderID: "ZERODHA_RECONCILED",
			}
		}
		position.InstrumentToken = brokerPosition.InstrumentToken
		position.Exchange = brokerPosition.Exchange
		position.Side = side
		position.Quantity = quantity
		position.EntryPrice = brokerPosition.AveragePrice
		position.CurrentLTP = brokerPosition.LastPrice
		position.PnLINR = brokerPosition.PnL
		position.StopFloorPct = -1
		position.StopLossPrice = roundPrice(stop)
		position.TargetPrice = roundPrice(target)
		position.UpdatedAt = time.Now()
		if position.EntryPrice > 0 && position.CurrentLTP > 0 {
			diff := position.CurrentLTP - position.EntryPrice
			if position.Side == SideShort {
				diff = -diff
			}
			position.PnLPct = diff / position.EntryPrice * 100
		}
		if err := m.store.SavePosition(ctx, position, eventType); err != nil {
			return err
		}
		_ = m.index.addPosition(ctx, position)
	}
	for _, position := range localPositions {
		if _, ok := seen[position.Symbol]; ok {
			continue
		}
		payload := map[string]any{"symbol": position.Symbol, "exit_reason": "BROKER_RECONCILIATION"}
		if err := m.store.RemovePosition(ctx, position.Symbol, payload); err != nil {
			return err
		}
		_ = m.index.removePosition(ctx, position.InstrumentToken)
	}
	return nil
}
