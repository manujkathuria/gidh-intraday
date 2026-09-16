package ordermanager

import (
	"context"
	"fmt"
	"log"
)

// SquareOffPosition closes the position and removes it from hot Redis state
func (m *Manager) SquareOffPosition(ctx context.Context, symbol, reason string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	activePositions, err := m.redisStore.GetActivePositions(ctx)
	if err != nil {
		return err
	}

	pos, exists := activePositions[symbol]
	if !exists {
		return fmt.Errorf("no active position found for %s", symbol)
	}

	if !m.isPaperTrading && m.kiteClient != nil {
		exitTxnType := "SELL"
		if pos.IsShort() {
			exitTxnType = "BUY"
		}
		exitOrderID, err := m.kiteClient.PlaceMISMarketOrder(ctx, pos.Exchange, pos.Symbol, exitTxnType, pos.Quantity, "GIDH_EXIT")
		if err != nil {
			log.Printf("[ORDER MANAGER ERROR] Failed to place square-off order for %s: %v", pos.Symbol, err)
		} else {
			log.Printf("[ORDER MANAGER] Squared off %s on Zerodha (%s %d) | OrderID: %s", pos.Symbol, exitTxnType, pos.Quantity, exitOrderID)
		}
	}

	if m.tracker != nil && pos.InstrumentToken > 0 {
		m.tracker.UnsubscribePosition(pos.InstrumentToken)
	}
	_ = m.redisStore.RemoveWSToken(ctx, pos.InstrumentToken)

	if err := m.redisStore.RemoveActivePosition(ctx, symbol); err != nil {
		return err
	}

	_ = m.redisStore.PublishLiveEvent(ctx, "POSITION_CLOSED", map[string]interface{}{
		"symbol":      pos.Symbol,
		"exit_price":  pos.CurrentLTP,
		"pnl_inr":     pos.PnLINR,
		"pnl_pct":     pos.PnLPct,
		"exit_reason": reason,
	})

	log.Printf("[ORDER MANAGER] Squared off %s @ %.2f | P&L: %+.2f INR (%+.2f%%) | Reason: %s",
		pos.Symbol, pos.CurrentLTP, pos.PnLINR, pos.PnLPct, reason)

	return nil
}
