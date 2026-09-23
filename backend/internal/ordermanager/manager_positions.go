package ordermanager

import (
	"context"
	"fmt"
	"time"
)

func (m *Manager) UpdatePositionLevels(ctx context.Context, symbol string, stopLossPrice, targetPrice *float64) (*ActivePosition, error) {
	symbol = normalizeSymbol(symbol)
	position, err := m.store.GetPosition(ctx, symbol)
	if err != nil {
		return nil, fmt.Errorf("active position for %s not found: %w", symbol, err)
	}
	if stopLossPrice != nil {
		if *stopLossPrice <= 0 {
			position.StopLossPrice = 0
		} else {
			position.StopLossPrice = roundPrice(*stopLossPrice)
		}
	}
	if targetPrice != nil {
		if *targetPrice <= 0 {
			position.TargetPrice = 0
		} else {
			position.TargetPrice = roundPrice(*targetPrice)
		}
	}
	position.UpdatedAt = time.Now()
	if err := m.store.SavePosition(ctx, position, "POSITION_UPDATED"); err != nil {
		return nil, fmt.Errorf("save updated position: %w", err)
	}
	return position, nil
}
