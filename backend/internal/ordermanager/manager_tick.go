package ordermanager

import (
	"context"
	"time"

	kitemodels "github.com/zerodha/gokiteconnect/v4/models"
)

// handleTick processes sub-second live price updates, evaluates virtual bracket triggers, and tracks PnL
func (m *Manager) handleTick(symbol string, tick kitemodels.Tick) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	ltp := tick.LastPrice
	if ltp <= 0 {
		return
	}

	m.processVirtualBrackets(ctx, symbol, ltp)
	m.processActivePositions(ctx, symbol, ltp)
}

func (m *Manager) processVirtualBrackets(ctx context.Context, symbol string, ltp float64) {
	vbos, err := m.redisStore.GetVirtualBracketOrders(ctx)
	if err != nil {
		return
	}

	for _, vbo := range vbos {
		if vbo.Symbol != symbol {
			continue
		}

		now := time.Now()
		vbo.CurrentLTP = ltp

		switch vbo.Status {
		case StatusPendingEntry:
			shouldFill := (vbo.Side == SideLong && ltp <= vbo.TargetEntryPrice) ||
				(vbo.Side == SideShort && ltp >= vbo.TargetEntryPrice)

			if shouldFill {
				vbo.ActualEntryPrice = ltp
				vbo.Status = StatusActive
				vbo.FilledAt = &now

				if !m.isPaperTrading && m.kiteClient != nil {
					txn := "BUY"
					if vbo.Side == SideShort {
						txn = "SELL"
					}
					id, _ := m.kiteClient.PlaceMISMarketOrder(ctx, vbo.Exchange, vbo.Symbol, txn, vbo.Quantity, "GIDH_ENTRY")
					vbo.BrokerOrderID = id
				}
				_ = m.redisStore.PublishLiveEvent(ctx, "VBO_FILLED", vbo)
			}

		case StatusActive:
			diff := ltp - vbo.ActualEntryPrice
			if vbo.Side == SideShort {
				diff = -diff
			}
			if vbo.ActualEntryPrice > 0 {
				vbo.PnLPct = (diff / vbo.ActualEntryPrice) * 100.0
			}
			vbo.PnLINR = diff * float64(vbo.Quantity)
			if vbo.PnLPct > vbo.MFEPct {
				vbo.MFEPct = vbo.PnLPct
			}

			// 1. Target Check (+2.0R or custom price if set)
			hitTarget := false
			if vbo.TargetPrice > 0 {
				hitTarget = (vbo.Side == SideLong && ltp >= vbo.TargetPrice) ||
					(vbo.Side == SideShort && ltp <= vbo.TargetPrice)
			}

			// 2. Stop Loss Check (1.0% MAE or custom price if set)
			hitStop := false
			if vbo.StopLossPrice > 0 {
				hitStop = (vbo.Side == SideLong && ltp <= vbo.StopLossPrice) ||
					(vbo.Side == SideShort && ltp >= vbo.StopLossPrice)
			}

			if hitTarget || hitStop {
				vbo.ExitPrice = ltp
				vbo.ClosedAt = &now
				if hitTarget {
					vbo.Status = StatusClosedTarget
					vbo.ExitReason = "TARGET_1_HIT"
				} else {
					vbo.Status = StatusClosedStop
					vbo.ExitReason = "STOP_LOSS_HIT"
				}

				if !m.isPaperTrading && m.kiteClient != nil {
					exitTxn := "SELL"
					if vbo.Side == SideShort {
						exitTxn = "BUY"
					}
					_, _ = m.kiteClient.PlaceMISMarketOrder(ctx, vbo.Exchange, vbo.Symbol, exitTxn, vbo.Quantity, "GIDH_EXIT")
				}
				_ = m.redisStore.PublishLiveEvent(ctx, "VBO_CLOSED", vbo)

				// Prune from active orders in Redis
				_ = m.redisStore.RemoveVirtualBracketOrder(ctx, vbo.ID)
				continue
			}
		}

		_ = m.redisStore.SaveVirtualBracketOrder(ctx, vbo)
	}
}

func (m *Manager) processActivePositions(ctx context.Context, symbol string, ltp float64) {
	activePositions, err := m.redisStore.GetActivePositions(ctx)
	if err != nil {
		return
	}

	pos, exists := activePositions[symbol]
	if !exists || pos == nil {
		return
	}

	pos.NormalizeSide()
	pos.CurrentLTP = ltp

	diff := ltp - pos.EntryPrice
	if pos.IsShort() {
		diff = -diff
	}
	if pos.EntryPrice > 0 {
		pos.PnLPct = (diff / pos.EntryPrice) * 100.0
	}
	pos.PnLINR = diff * float64(pos.Quantity)
	if pos.PnLPct > pos.MFEPct {
		pos.MFEPct = pos.PnLPct
	}

	_ = m.redisStore.SaveActivePosition(ctx, pos)
	_ = m.redisStore.PublishLiveEvent(ctx, "TICK", pos)
}
