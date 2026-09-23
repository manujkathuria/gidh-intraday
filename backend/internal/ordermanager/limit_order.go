package ordermanager

import (
	"context"
	"fmt"
)

func (m *Manager) PlaceLimitOrder(ctx context.Context, input PlaceLimitInput) (*ManagedOrder, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	input.Symbol = normalizeSymbol(input.Symbol)
	if input.LimitPrice <= 0 {
		return nil, fmt.Errorf("limitPrice must be positive")
	}
	existing, err := m.store.GetOrderByClientID(ctx, input.ClientOrderID)
	if err != nil {
		return nil, fmt.Errorf("check client order id: %w", err)
	}
	if existing != nil {
		if existing.Symbol != input.Symbol || existing.Side != input.Side || existing.OrderType != OrderTypeSyntheticLimit || existing.MarginINR != input.MarginINR || existing.LimitPrice != input.LimitPrice {
			return nil, fmt.Errorf("client order id %s was already used with a different payload", input.ClientOrderID)
		}
		return existing, nil
	}
	instrument, err := m.validateBase(ctx, input.PlaceMarketInput)
	if err != nil {
		return nil, err
	}
	currentPrice, err := m.referencePrice(ctx, instrument)
	if err != nil || currentPrice <= 0 {
		return nil, fmt.Errorf("resolve current price for %s: %w", instrument.Symbol, err)
	}
	order := m.newOrder(input.PlaceMarketInput, instrument, OrderTypeSyntheticLimit, currentPrice, input.LimitPrice)
	order.Status = StatusPending
	order, created, err := m.createIdempotent(ctx, order)
	if err != nil || !created {
		return order, err
	}
	if err := m.index.addPending(ctx, order.InstrumentToken, order.ID); err != nil {
		return nil, fmt.Errorf("subscribe limit order token: %w", err)
	}
	return order, nil
}

func (m *Manager) CancelLimitOrder(ctx context.Context, id string) (*ManagedOrder, error) {
	order, err := m.store.GetOrder(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("load limit order: %w", err)
	}
	if order.OrderType != OrderTypeSyntheticLimit {
		return nil, fmt.Errorf("order %s is not a synthetic limit order", id)
	}
	if order.Status != StatusPending {
		return nil, fmt.Errorf("only PENDING limit orders can be cancelled; current status is %s", order.Status)
	}
	updated, err := m.store.Transition(ctx, order, StatusCancelled, nil)
	if err != nil {
		return nil, err
	}
	_ = m.index.removePending(ctx, order.InstrumentToken, order.ID)
	return updated, nil
}
