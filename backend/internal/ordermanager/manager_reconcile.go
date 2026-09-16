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
					PnLINR:          np.PnL,
					StopFloorPct:    -1.50,
					Tactic:          "LIVE_ADOPTED",
					BrokerOrderID:   "ZERODHA_SYNC",
					OpenedAt:        time.Now(),
					UpdatedAt:       time.Now(),
				}
				_ = m.redisStore.SaveActivePosition(ctx, pos)
				log.Printf("[ORDER MANAGER] Adopted open Zerodha MIS position: %s %s @ %.2f (Qty: %d)", side, np.Tradingsymbol, np.AveragePrice, qty)
			} else {
				pos.Quantity = qty
				pos.EntryPrice = np.AveragePrice
				pos.CurrentLTP = np.LastPrice
				pos.PnLINR = np.PnL
				_ = m.redisStore.SaveActivePosition(ctx, pos)
			}

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
