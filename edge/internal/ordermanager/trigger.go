package ordermanager

import (
	"context"
	"errors"
	"log"
	"time"
)

func (m *Manager) HandleTick(token uint32, ltp float64, at time.Time) {
	if token == 0 || ltp <= 0 {
		return
	}
	if at.IsZero() {
		at = time.Now()
	}
	m.latestMu.Lock()
	m.latestTicks[token] = tickValue{price: ltp, at: at}
	m.latestMu.Unlock()

	for _, id := range m.index.pendingIDs(token) {
		order, err := m.store.GetOrder(context.Background(), id)
		if err != nil || order.Status != StatusPending {
			continue
		}
		triggered := order.Side == SideLong && ltp <= order.LimitPrice
		triggered = triggered || order.Side == SideShort && ltp >= order.LimitPrice
		if !triggered {
			continue
		}
		claimed, err := m.store.Transition(context.Background(), order, StatusTriggering, func(next *ManagedOrder) {
			now := time.Now()
			next.TriggeredAt = &now
			next.ReferencePrice = ltp
		})
		if errors.Is(err, ErrTransitionConflict) {
			continue
		}
		if err != nil {
			log.Printf("[ORDER MANAGER] claim trigger %s: %v", id, err)
			continue
		}
		_ = m.index.removePending(context.Background(), token, id)
		go func(order *ManagedOrder, price float64) {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			if _, err := m.submitEntry(ctx, order, price); err != nil {
				log.Printf("[ORDER MANAGER] submit triggered order %s: %v", order.ID, err)
			}
		}(claimed, ltp)
	}

	if symbol := m.index.positionSymbol(token); symbol != "" {
		m.processPositionTick(symbol, token, ltp)
	}
}

func (m *Manager) processPositionTick(symbol string, token uint32, ltp float64) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	position, err := m.store.GetPosition(ctx, symbol)
	if err != nil {
		return
	}
	position.updatePnL(ltp)

	m.latestMu.Lock()
	last := m.lastPersist[symbol]
	shouldPersist := time.Since(last) >= time.Second
	if shouldPersist {
		m.lastPersist[symbol] = time.Now()
	}
	m.latestMu.Unlock()
	if shouldPersist {
		_ = m.store.SavePosition(ctx, position, "POSITION_UPDATED")
	}

	hitStop := position.StopLossPrice > 0 && (
		(position.Side == SideLong && ltp <= position.StopLossPrice) ||
		(position.Side == SideShort && ltp >= position.StopLossPrice))
	hitTarget := position.TargetPrice > 0 && (
		(position.Side == SideLong && ltp >= position.TargetPrice) ||
		(position.Side == SideShort && ltp <= position.TargetPrice))
	if !hitStop && !hitTarget {
		return
	}
	reason := "TARGET_2R_HIT"
	if hitStop {
		reason = "FIXED_MAE_STOP_HIT"
	}
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if _, err := m.SquareOffPosition(ctx, symbol, reason, "SYSTEM"); err != nil {
			log.Printf("[ORDER MANAGER] automatic exit %s: %v", symbol, err)
		}
	}()
	_ = token
}
