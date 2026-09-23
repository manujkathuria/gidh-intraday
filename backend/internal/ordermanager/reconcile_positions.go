package ordermanager

import (
	"context"
	"fmt"
	"math"
	"time"
)

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
		position := localBySymbol[brokerPosition.Symbol]
		eventType := "POSITION_UPDATED"
		var stop, target float64
		if position == nil {
			eventType = "POSITION_OPENED"
			position = &ActivePosition{
				Symbol: brokerPosition.Symbol, OpenedAt: time.Now(),
				Invalidation: "BROKER_DISCOVERED", BrokerOrderID: "ZERODHA_RECONCILED",
			}
		} else {
			stop = position.StopLossPrice
			target = position.TargetPrice
		}
		position.InstrumentToken = brokerPosition.InstrumentToken
		position.Exchange = brokerPosition.Exchange
		position.Side = side
		position.Quantity = quantity
		position.EntryPrice = brokerPosition.AveragePrice
		position.CurrentLTP = brokerPosition.LastPrice
		position.PnLINR = brokerPosition.PnL
		position.StopFloorPct = -1
		position.StopLossPrice = stop
		position.TargetPrice = target
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
