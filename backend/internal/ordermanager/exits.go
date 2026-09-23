package ordermanager

import (
	"context"
	"fmt"
	"time"

	"gidh-intraday/backend/internal/broker"
)

func (m *Manager) SquareOffPosition(ctx context.Context, symbol, reason, initiatedBy string) (*ManagedOrder, error) {
	symbol = normalizeSymbol(symbol)
	position, err := m.store.GetPosition(ctx, symbol)
	if err != nil {
		return nil, fmt.Errorf("active position %s not found: %w", symbol, err)
	}
	id := newID("exit")
	claimed, err := m.store.ClaimPositionExit(ctx, symbol, id)
	if err != nil {
		return nil, err
	}
	if !claimed {
		return nil, fmt.Errorf("an exit for %s is already in progress", symbol)
	}

	side := SideShort
	if position.Side == SideShort {
		side = SideLong
	}
	now := time.Now()
	referencePrice := position.CurrentLTP
	if referencePrice <= 0 {
		referencePrice = position.EntryPrice
	}
	order := &ManagedOrder{
		ID: id, ClientOrderID: id, BrokerTag: brokerTag(id), IsExit: true,
		OrderType: OrderTypeMarket, Status: StatusSubmitting,
		Symbol: position.Symbol, InstrumentToken: position.InstrumentToken, Exchange: position.Exchange,
		Side: side, Quantity: position.Quantity, ReferencePrice: referencePrice,
		Invalidation: reason, InitiatedBy: initiatedBy, Revision: 1, CreatedAt: now, UpdatedAt: now,
	}
	order, created, err := m.createIdempotent(ctx, order)
	if err != nil {
		_ = m.store.ReleasePositionExit(ctx, symbol)
		return nil, err
	}
	if !created {
		return order, err
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
		return updated, fmt.Errorf("exit submission requires reconciliation: %w", err)
	}
	order, err = m.store.Transition(ctx, order, StatusExitSubmitted, func(next *ManagedOrder) {
		next.BrokerOrderID = placed.OrderID
		next.SubmittedAt = &now
	})
	if err != nil {
		return nil, err
	}
	if placed.Status == "COMPLETE" {
		return m.applyExitFill(ctx, order, position, placed)
	}
	confirmed, err := m.broker.GetOrder(ctx, placed.OrderID)
	if err != nil {
		return order, nil
	}
	if confirmed.Status == "COMPLETE" {
		return m.applyExitFill(ctx, order, position, confirmed)
	}
	if confirmed.Status == "REJECTED" || confirmed.Status == "CANCELLED" {
		updated, transitionErr := m.store.Transition(ctx, order, StatusRejected, func(next *ManagedOrder) {
			next.RejectionReason = confirmed.StatusMessage
		})
		if transitionErr == nil {
			_ = m.store.ReleasePositionExit(ctx, position.Symbol)
		}
		return updated, transitionErr
	}
	return order, nil
}

func (m *Manager) applyExitFill(ctx context.Context, order *ManagedOrder, position *ActivePosition, brokerOrder broker.BrokerOrder) (*ManagedOrder, error) {
	payload := map[string]any{
		"symbol": position.Symbol, "exit_price": brokerOrder.AveragePrice,
		"pnl_inr": position.PnLINR, "pnl_pct": position.PnLPct,
		"exit_reason": order.Invalidation, "broker_order_id": brokerOrder.OrderID,
	}
	updated, err := m.store.ClosePosition(ctx, order, position, brokerOrder.AveragePrice, payload)
	if err != nil {
		return nil, err
	}
	_ = m.index.removePosition(ctx, position.InstrumentToken)
	return updated, nil
}
