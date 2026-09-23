package ordermanager

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math"
	"strings"
	"time"
)

func (m *Manager) createIdempotent(ctx context.Context, order *ManagedOrder) (*ManagedOrder, bool, error) {
	existing, created, err := m.store.CreateOrder(ctx, order)
	if err != nil {
		return nil, false, err
	}
	if !created {
		if err := sameIntent(existing, order); err != nil {
			return nil, false, err
		}
		return existing, false, nil
	}
	return order, true, nil
}

func withinMarketSession(now time.Time) bool {
	loc, err := time.LoadLocation("Asia/Kolkata")
	if err == nil {
		now = now.In(loc)
	}
	if now.Weekday() == time.Saturday || now.Weekday() == time.Sunday {
		return false
	}
	minutes := now.Hour()*60 + now.Minute()
	return minutes >= 9*60+15 && minutes <= 15*60+30
}

func terminal(status ManagedOrderStatus) bool {
	return status == StatusFilled || status == StatusRejected || status == StatusCancelled || status == StatusClosed
}

func transactionType(side TradeSide) string {
	if side == SideShort {
		return "SELL"
	}
	return "BUY"
}

func fixedLevels(side TradeSide, fill float64) (float64, float64) {
	if side == SideShort {
		return fill * 1.01, fill * 0.98
	}
	return fill * 0.99, fill * 1.02
}

func (p *ActivePosition) updatePnL(ltp float64) {
	p.CurrentLTP = ltp
	diff := ltp - p.EntryPrice
	if p.Side == SideShort {
		diff = -diff
	}
	p.PnLINR = diff * float64(p.Quantity)
	if p.EntryPrice > 0 {
		p.PnLPct = diff / p.EntryPrice * 100
	}
	if p.PnLPct > p.MFEPct {
		p.MFEPct = p.PnLPct
	}
	p.UpdatedAt = time.Now()
}

func newID(prefix string) string {
	buf := make([]byte, 12)
	if _, err := rand.Read(buf); err != nil {
		return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
	}
	return prefix + "-" + hex.EncodeToString(buf)
}

func brokerTag(id string) string {
	compact := strings.ReplaceAll(id, "-", "")
	if len(compact) > 16 {
		compact = compact[len(compact)-16:]
	}
	return "GIDH" + compact
}

func roundPrice(price float64) float64 { return math.Round(price*100) / 100 }
