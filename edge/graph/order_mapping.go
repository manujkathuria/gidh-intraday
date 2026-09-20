package graph

import (
	"gidh-intraday/edge/graph/model"
	"gidh-intraday/edge/internal/ordermanager"
)

func managedOrderModel(order *ordermanager.ManagedOrder) *model.ManagedOrder {
	if order == nil {
		return nil
	}
	return &model.ManagedOrder{
		ID: order.ID, ClientOrderID: order.ClientOrderID,
		BrokerOrderID: optionalNonEmpty(order.BrokerOrderID),
		OrderType:     model.ManagedOrderType(order.OrderType),
		Status:        model.ManagedOrderStatus(order.Status), Symbol: order.Symbol,
		InstrumentToken: int(order.InstrumentToken), Exchange: order.Exchange,
		Side: model.TradeSide(order.Side), Quantity: order.Quantity, MarginInr: order.MarginINR,
		LimitPrice:          optionalPositive(order.LimitPrice),
		ExpectedStopPrice:   optionalPositive(order.ExpectedStopPrice),
		ExpectedTargetPrice: optionalPositive(order.ExpectedTargetPrice),
		ActualFillPrice:     optionalPositive(order.ActualFillPrice),
		StopPrice:           optionalPositive(order.StopPrice), TargetPrice: optionalPositive(order.TargetPrice),
		RejectionReason: optionalNonEmpty(order.RejectionReason),
		CreatedAt:       order.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:       order.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

func activePositionModels(positions []*ordermanager.ActivePosition) []*model.ActivePosition {
	result := make([]*model.ActivePosition, 0, len(positions))
	for _, position := range positions {
		stop, target := position.StopLossPrice, position.TargetPrice
		tactic, invalidation, brokerID := position.Tactic, position.Invalidation, position.BrokerOrderID
		result = append(result, &model.ActivePosition{
			Symbol: position.Symbol, InstrumentToken: int(position.InstrumentToken),
			Exchange: position.Exchange, Side: string(position.Side), Quantity: position.Quantity,
			EntryPrice: position.EntryPrice, CurrentLtp: position.CurrentLTP,
			PnlInr: position.PnLINR, PnlPct: position.PnLPct, MfePct: position.MFEPct,
			StopFloorPct: position.StopFloorPct, StopLossPrice: &stop, TargetPrice: &target,
			Tactic: &tactic, Invalidation: &invalidation, BrokerOrderID: &brokerID,
			OpenedAt:  position.OpenedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt: position.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}
	return result
}

func closedPositionModels(positions []*ordermanager.ClosedPosition) []*model.ClosedPosition {
	result := make([]*model.ClosedPosition, 0, len(positions))
	for _, p := range positions {
		brokerID := p.BrokerOrderID
		result = append(result, &model.ClosedPosition{
			ID:              p.ID,
			Symbol:          p.Symbol,
			InstrumentToken: int(p.InstrumentToken),
			Exchange:        p.Exchange,
			Side:            model.TradeSide(p.Side),
			Quantity:        p.Quantity,
			EntryPrice:      p.EntryPrice,
			ExitPrice:       p.ExitPrice,
			PnlInr:          p.PnLINR,
			PnlPct:          p.PnLPct,
			OpenedAt:        p.OpenedAt.Format("2006-01-02T15:04:05Z07:00"),
			ClosedAt:        p.ClosedAt.Format("2006-01-02T15:04:05Z07:00"),
			ExitReason:      p.ExitReason,
			BrokerOrderID:   optionalNonEmpty(brokerID),
		})
	}
	return result
}

func optionalString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func optionalNonEmpty(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

func optionalPositive(value float64) *float64 {
	if value <= 0 {
		return nil
	}
	return &value
}
