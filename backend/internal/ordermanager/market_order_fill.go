package ordermanager

import (
	"context"
	"time"

	"gidh-intraday/backend/internal/broker"
)

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
