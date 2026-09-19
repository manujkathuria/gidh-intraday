package ordermanager

import (
	"context"
	"fmt"
	"log"
)

// UpdateVirtualBracketLevels allows updating Stop Loss and/or Target price after order placement
func (m *Manager) UpdateVirtualBracketLevels(ctx context.Context, id string, stopLossPrice, targetPrice float64) (*VirtualBracketOrder, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	vbos, err := m.redisStore.GetVirtualBracketOrders(ctx)
	if err != nil {
		return nil, err
	}

	vbo, exists := vbos[id]
	if !exists {
		return nil, fmt.Errorf("virtual bracket order %s not found", id)
	}

	if stopLossPrice > 0 {
		vbo.StopLossPrice = stopLossPrice
	}
	if targetPrice > 0 {
		vbo.TargetPrice = targetPrice
	}

	if err := m.redisStore.SaveVirtualBracketOrder(ctx, vbo); err != nil {
		return nil, err
	}

	_ = m.redisStore.PublishLiveEvent(ctx, "VBO_UPDATED", vbo)
	log.Printf("[VIRTUAL ENGINE] Updated %s (%s) | Stop: %.2f | Target: %.2f", id, vbo.Symbol, vbo.StopLossPrice, vbo.TargetPrice)
	return vbo, nil
}
