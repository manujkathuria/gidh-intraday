package ordermanager

import (
	"context"
	"fmt"
	"log"
	"time"
)

// SyncWithZerodha performs authoritative reconciliation against Zerodha Kite API (Single Source of Truth)
func (m *Manager) SyncWithZerodha(ctx context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.isPaperTrading || m.kiteClient == nil {
		log.Println("[ORDER MANAGER] Paper trading mode or no Kite client — skipping broker position sync.")
		return nil
	}

	log.Println("[ORDER MANAGER] Reconciling active positions against Zerodha Source of Truth...")

	positions, err := m.kiteClient.FetchPositions(ctx)
	if err != nil {
		log.Printf("[ORDER MANAGER WARN] FetchPositions failed: %v", err)
		return err
	}

	activePositions, err := m.redisStore.GetActivePositions(ctx)
	if err != nil {
		return fmt.Errorf("failed to load active positions from redis: %w", err)
	}

	brokerNetMap := make(map[string]bool)
	for _, np := range positions.Net {
		if np.Product == "MIS" && np.Quantity != 0 {
			brokerNetMap[np.Tradingsymbol] = true
			side := SideLong
			qty := np.Quantity
			if qty < 0 {
				side = SideShort
				qty = -qty
			}

			pos, exists := activePositions[np.Tradingsymbol]
			if !exists {
				pos = &ActivePosition{
					Symbol:          np.Tradingsymbol,
					InstrumentToken: uint32(np.InstrumentToken),
					Exchange:        np.Exchange,
					Side:            side,
					Quantity:        qty,
					EntryPrice:      np.AveragePrice,
					CurrentLTP:      np.LastPrice,
					StopFloorPct:    -1.50,
					Tactic:          "LIVE_ADOPTED",
					BrokerOrderID:   "ZERODHA_SYNC",
					OpenedAt:        time.Now(),
					UpdatedAt:       time.Now(),
				}
				log.Printf("[ORDER MANAGER] Adopted open Zerodha MIS position: %s %s @ %.2f (Qty: %d)", side, np.Tradingsymbol, np.AveragePrice, qty)
			}

			pos.Side = side
			pos.Quantity = qty
			if np.AveragePrice > 0 {
				pos.EntryPrice = np.AveragePrice
			}
			if np.LastPrice > 0 {
				pos.CurrentLTP = np.LastPrice
			}

			var priceDiff float64
			if side == SideLong {
				priceDiff = pos.CurrentLTP - pos.EntryPrice
			} else {
				priceDiff = pos.EntryPrice - pos.CurrentLTP
			}

			if pos.EntryPrice > 0 {
				pos.PnLPct = (priceDiff / pos.EntryPrice) * 100.0
			}
			pos.PnLINR = priceDiff * float64(pos.Quantity)

			if pos.PnLPct > pos.MFEPct {
				pos.MFEPct = pos.PnLPct
			}

			_ = m.redisStore.SaveActivePosition(ctx, pos)


			if m.tracker != nil && pos.InstrumentToken > 0 {
				m.tracker.SubscribePosition(pos.Symbol, pos.InstrumentToken)
				_ = m.redisStore.AddWSToken(ctx, pos.InstrumentToken)
			}
		}
	}

	for sym, p := range activePositions {
		if !brokerNetMap[sym] {
			log.Printf("[ORDER MANAGER] Pruning closed position from Redis: %s", sym)
			_ = m.redisStore.RemoveActivePosition(ctx, sym)
			if m.tracker != nil && p.InstrumentToken > 0 {
				m.tracker.UnsubscribePosition(p.InstrumentToken)
				_ = m.redisStore.RemoveWSToken(ctx, p.InstrumentToken)
			}
		}
	}

	updated, _ := m.redisStore.GetActivePositions(ctx)
	log.Printf("[ORDER MANAGER] Reconciliation complete. Active tracked positions: %d/%d slots", len(updated), m.maxSlots)
	return nil
}
