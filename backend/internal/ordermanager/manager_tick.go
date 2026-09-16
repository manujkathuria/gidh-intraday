package ordermanager

import (
	"context"
	"time"

	kitemodels "github.com/zerodha/gokiteconnect/v4/models"
)

// handleTick processes sub-second live price updates, computes P&L, MFE, and applies milestone ratchets
func (m *Manager) handleTick(symbol string, tick kitemodels.Tick) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	activePositions, err := m.redisStore.GetActivePositions(ctx)
	if err != nil {
		return
	}

	pos, exists := activePositions[symbol]
	if !exists || pos == nil {
		return
	}

	ltp := tick.LastPrice
	if ltp <= 0 {
		return
	}

	pos.NormalizeSide()
	pos.CurrentLTP = ltp

	var priceDiff float64
	if pos.IsLong() {
		priceDiff = ltp - pos.EntryPrice
	} else {
		priceDiff = pos.EntryPrice - ltp
	}

	if pos.EntryPrice > 0 {
		pos.PnLPct = (priceDiff / pos.EntryPrice) * 100.0
	}
	pos.PnLINR = priceDiff * float64(pos.Quantity)


	if pos.PnLPct > pos.MFEPct {
		pos.MFEPct = pos.PnLPct
	}

	// Milestone Trailing Ratchet Rule (HOLD_RATCHET_MILESTONES_03)
	if pos.MFEPct >= 4.00 && pos.StopFloorPct < 2.50 {
		pos.StopFloorPct = 2.50
		_ = m.redisStore.PublishLiveEvent(ctx, "RATCHET_ALERT", map[string]interface{}{
			"symbol":     pos.Symbol,
			"milestone":  "+4.00% MFE",
			"stop_floor": "+2.50% Profit Lock",
		})
	} else if pos.MFEPct >= 2.50 && pos.StopFloorPct < 1.00 {
		pos.StopFloorPct = 1.00
		_ = m.redisStore.PublishLiveEvent(ctx, "RATCHET_ALERT", map[string]interface{}{
			"symbol":     pos.Symbol,
			"milestone":  "+2.50% MFE",
			"stop_floor": "+1.00% Profit Lock",
		})
	} else if pos.MFEPct >= 1.50 && pos.StopFloorPct < 0.00 {
		pos.StopFloorPct = 0.00
		_ = m.redisStore.PublishLiveEvent(ctx, "RATCHET_ALERT", map[string]interface{}{
			"symbol":     pos.Symbol,
			"milestone":  "+1.50% MFE",
			"stop_floor": "0.00% Breakeven Lock",
		})
	}

	_ = m.redisStore.SaveActivePosition(ctx, pos)
	_ = m.redisStore.PublishLiveEvent(ctx, "TICK", pos)
}
