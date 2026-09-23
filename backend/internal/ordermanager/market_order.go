package ordermanager

import (
	"context"
	"fmt"
	"time"

	"gidh-intraday/backend/internal/broker"
)

func (m *Manager) PlaceMarketOrder(ctx context.Context, input PlaceMarketInput) (*ManagedOrder, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	input.Symbol = normalizeSymbol(input.Symbol)
	existing, err := m.store.GetOrderByClientID(ctx, input.ClientOrderID)
	if err != nil {
		return nil, fmt.Errorf("check client order id: %w", err)
	}
	if existing != nil {
		if existing.Symbol != input.Symbol || existing.Side != input.Side || existing.OrderType != OrderTypeMarket || existing.MarginINR != input.MarginINR {
			return nil, fmt.Errorf("client order id %s was already used with a different payload", input.ClientOrderID)
		}
		return existing, nil
	}
	instrument, err := m.validateBase(ctx, input)
	if err != nil {
		return nil, err
	}
	price, err := m.referencePrice(ctx, instrument)
	if err != nil || price <= 0 {
		return nil, fmt.Errorf("resolve current price for %s: %w", instrument.Symbol, err)
	}
	order := m.newOrder(input, instrument, OrderTypeMarket, price, 0)
	order.Status = StatusSubmitting
	order, created, err := m.createIdempotent(ctx, order)
	if err != nil || !created {
		return order, err
	}
	return m.submitEntry(ctx, order, price)
}

func (m *Manager) submitEntry(ctx context.Context, order *ManagedOrder, referencePrice float64) (*ManagedOrder, error) {
	if order.Status == StatusTriggering {
		var err error
		order, err = m.store.Transition(ctx, order, StatusSubmitting, nil)
		if err != nil {
			return nil, err
		}
	}

	placed, err := m.broker.PlaceMISMarketOrder(ctx, broker.MarketOrderRequest{
		Exchange: order.Exchange, Symbol: order.Symbol,
		TransactionType: transactionType(order.Side), Quantity: order.Quantity,
		Tag: order.BrokerTag, ReferencePrice: referencePrice,
	})
	if err != nil {
		updated, transitionErr := m.store.Transition(ctx, order, StatusReconcileRequired, func(next *ManagedOrder) {
			next.RejectionReason = err.Error()
		})
		if transitionErr != nil {
			return nil, transitionErr
		}
		return updated, fmt.Errorf("broker submission requires reconciliation: %w", err)
	}

	now := time.Now()
	order, err = m.store.Transition(ctx, order, StatusSubmitted, func(next *ManagedOrder) {
		next.BrokerOrderID = placed.OrderID
		next.SubmittedAt = &now
	})
	if err != nil {
		return nil, err
	}
	if placed.Status == "COMPLETE" {
		return m.applyEntryFill(ctx, order, placed)
	}

	confirmed, err := m.broker.GetOrder(ctx, placed.OrderID)
	if err != nil {
		return order, nil
	}
	return m.applyBrokerEntryStatus(ctx, order, confirmed)
}

func (m *Manager) applyBrokerEntryStatus(ctx context.Context, order *ManagedOrder, brokerOrder broker.BrokerOrder) (*ManagedOrder, error) {
	switch brokerOrder.Status {
	case "COMPLETE":
		return m.applyEntryFill(ctx, order, brokerOrder)
	case "REJECTED", "CANCELLED":
		return m.store.Transition(ctx, order, StatusRejected, func(next *ManagedOrder) {
			next.RejectionReason = brokerOrder.StatusMessage
		})
	default:
		return order, nil
	}
}

func (m *Manager) applyEntryFill(ctx context.Context, order *ManagedOrder, brokerOrder broker.BrokerOrder) (*ManagedOrder, error) {
	fill := brokerOrder.AveragePrice
	if fill <= 0 {
		return m.store.Transition(ctx, order, StatusReconcileRequired, func(next *ManagedOrder) {
			next.RejectionReason = "broker reported completion without an average fill price"
		})
	}
	quantity := brokerOrder.FilledQuantity
	if quantity <= 0 {
		quantity = order.Quantity
	}
	var stop, target float64
	if order.ExpectedStopPrice > 0 || order.ExpectedTargetPrice > 0 {
		stop, target = fixedLevels(order.Side, fill)
		stop, target = roundPrice(stop), roundPrice(target)
	}
	existingPos, _ := m.store.GetPosition(ctx, order.Symbol)
	now := time.Now()
	var position *ActivePosition

	if existingPos != nil && existingPos.Side == order.Side {
		// Blend weighted average entry price
		totalQty := existingPos.Quantity + quantity
		avgEntryPrice := ((existingPos.EntryPrice * float64(existingPos.Quantity)) + (fill * float64(quantity))) / float64(totalQty)
		avgEntryPrice = roundPrice(avgEntryPrice)

		position = &ActivePosition{
			Symbol: order.Symbol, InstrumentToken: order.InstrumentToken, Exchange: order.Exchange,
			Side: order.Side, Quantity: totalQty, EntryPrice: avgEntryPrice, CurrentLTP: fill,
			StopFloorPct: existingPos.StopFloorPct, StopLossPrice: stop, TargetPrice: target,
			Tactic: order.Tactic, Invalidation: order.Invalidation, BrokerOrderID: brokerOrder.OrderID,
			OpenedAt: existingPos.OpenedAt, UpdatedAt: now,
		}
	} else {
		position = &ActivePosition{
			Symbol: order.Symbol, InstrumentToken: order.InstrumentToken, Exchange: order.Exchange,
			Side: order.Side, Quantity: quantity, EntryPrice: fill, CurrentLTP: fill,
			StopFloorPct: -1, StopLossPrice: stop, TargetPrice: target,
			Tactic: order.Tactic, Invalidation: order.Invalidation, BrokerOrderID: brokerOrder.OrderID,
			OpenedAt: now, UpdatedAt: now,
		}
	}

	updated, err := m.store.FillEntry(ctx, order, position)
	if err != nil {
		return nil, err
	}
	_ = m.index.removePending(ctx, order.InstrumentToken, order.ID)
	_ = m.index.addPosition(ctx, position)
	return updated, nil
}

func normalizeSymbol(symbol string) string {
	result := make([]byte, 0, len(symbol))
	for i := 0; i < len(symbol); i++ {
		c := symbol[i]
		if c >= 'a' && c <= 'z' {
			c -= 'a' - 'A'
		}
		if c != ' ' && c != '\t' && c != '\n' {
			result = append(result, c)
		}
	}
	return string(result)
}
