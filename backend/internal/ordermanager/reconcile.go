package ordermanager

import (
	"context"
	"fmt"
	"log"
	"time"

	"gidh-intraday/backend/internal/broker"
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
		if terminal(order.Status) || order.Status == StatusPending {
			continue
		}
		if order.BrokerOrderID == "" {
			var handled bool
			order, handled, firstErr = m.reconcileMissingBrokerOrder(ctx, order, byTag, firstErr)
			if !handled {
				continue
			}
		}
		firstErr = m.reconcileOrderState(ctx, order, firstErr)
	}
	if m.config.LiveExecution {
		if positionErr := m.reconcilePositions(ctx); positionErr != nil && firstErr == nil {
			firstErr = positionErr
		}
	}
	return firstErr
}

func (m *Manager) reconcileMissingBrokerOrder(ctx context.Context, order *ManagedOrder, byTag map[string]broker.BrokerOrder, firstErr error) (*ManagedOrder, bool, error) {
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
		return order, false, firstErr
	}
	nextStatus := StatusSubmitted
	if order.IsExit {
		nextStatus = StatusExitSubmitted
	}
	var err error
	order, err = m.store.Transition(ctx, order, nextStatus, func(next *ManagedOrder) {
		next.BrokerOrderID = discovered.OrderID
	})
	if err != nil && firstErr == nil {
		firstErr = err
	}
	return order, true, firstErr
}

func (m *Manager) reconcileOrderState(ctx context.Context, order *ManagedOrder, firstErr error) error {
	brokerOrder, getErr := m.broker.GetOrder(ctx, order.BrokerOrderID)
	if getErr != nil {
		if firstErr == nil {
			firstErr = fmt.Errorf("reconcile %s: %w", order.ID, getErr)
		}
		return firstErr
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
	return firstErr
}
