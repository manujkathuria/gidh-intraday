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

// CancelVirtualBracketOrder removes a pending limit order before execution
func (m *Manager) CancelVirtualBracketOrder(ctx context.Context, id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	vbos, err := m.redisStore.GetVirtualBracketOrders(ctx)
	if err != nil {
		return err
	}

	vbo, exists := vbos[id]
	if !exists {
		return fmt.Errorf("virtual bracket order %s not found", id)
	}

	if vbo.Status == StatusActive {
		return fmt.Errorf("order %s is active: use SquareOffVirtualBracketOrder instead", id)
	}

	vbo.Status = StatusCancelled
	_ = m.redisStore.RemoveVirtualBracketOrder(ctx, id)
	_ = m.redisStore.PublishLiveEvent(ctx, "VBO_CANCELLED", vbo)
	log.Printf("[VIRTUAL ENGINE] Cancelled pending virtual bracket %s (%s)", id, vbo.Symbol)
	return nil
}

// SquareOffVirtualBracketOrder closes an active virtual bracket with a market order
func (m *Manager) SquareOffVirtualBracketOrder(ctx context.Context, id, reason string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	vbos, err := m.redisStore.GetVirtualBracketOrders(ctx)
	if err != nil {
		return err
	}

	vbo, exists := vbos[id]
	if !exists {
		return fmt.Errorf("virtual bracket order %s not found", id)
	}

	if vbo.Status != StatusActive {
		_ = m.redisStore.RemoveVirtualBracketOrder(ctx, id)
		return nil
	}

	if !m.isPaperTrading && m.kiteClient != nil {
		exitTxn := "SELL"
		if vbo.Side == SideShort {
			exitTxn = "BUY"
		}
		_, _ = m.kiteClient.PlaceMISMarketOrder(ctx, vbo.Exchange, vbo.Symbol, exitTxn, vbo.Quantity, "GIDH_MANUAL_EXIT")
	}

	vbo.Status = StatusClosedEOD
	vbo.ExitReason = reason
	_ = m.redisStore.RemoveVirtualBracketOrder(ctx, id)
	_ = m.redisStore.PublishLiveEvent(ctx, "VBO_CLOSED", vbo)
	log.Printf("[VIRTUAL ENGINE] Squared off virtual bracket %s (%s) | Reason: %s", id, vbo.Symbol, reason)
	return nil
}
