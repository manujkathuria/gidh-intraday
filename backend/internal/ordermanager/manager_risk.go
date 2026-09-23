package ordermanager

import (
	"context"
	"fmt"
	"log"
	"time"
)

func (m *Manager) RiskState(ctx context.Context) (*RiskState, error) {
	return m.store.RiskState(ctx)
}

func (m *Manager) ResetTripwire(ctx context.Context) error {
	m.tripMu.Lock()
	m.orderTimes = nil
	m.tripMu.Unlock()
	log.Println("[ORDER MANAGER] Tripwire fuse manually reset. Order execution re-enabled.")
	if m.store != nil {
		return m.store.SetRiskState(ctx, &RiskState{
			KillSwitch:    false,
			CircuitBroken: false,
			Reason:        "",
		})
	}
	return nil
}

func (m *Manager) checkAndTripwire(ctx context.Context) error {
	now := time.Now()
	cutoff := now.Add(-3 * time.Second)

	m.tripMu.Lock()
	defer m.tripMu.Unlock()

	valid := make([]time.Time, 0, len(m.orderTimes))
	for _, t := range m.orderTimes {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}

	// Tripwire Fuse Rule: Disable order manager if >5 orders placed within 3 seconds
	if len(valid) >= 5 {
		m.orderTimes = valid
		reason := "TRIPWIRE FUSE TRIPPED: Rate limit exceeded (>5 orders placed within 3 seconds). Order manager disabled for safety."
		log.Printf("[TRIPWIRE FUSE ALERT] 🚨 %s", reason)
		if m.store != nil {
			_ = m.store.SetRiskState(ctx, &RiskState{
				KillSwitch:    true,
				CircuitBroken: true,
				Reason:        reason,
			})
		}
		return fmt.Errorf("%s", reason)
	}

	valid = append(valid, now)
	m.orderTimes = valid
	return nil
}
