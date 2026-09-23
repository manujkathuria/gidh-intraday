package marketdata

import (
	"context"
	"time"
)

func (e *UniverseStreamEngine) runMinuteFlusher(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	lastFlushedMinute := -1
	for {
		select {
		case <-ctx.Done():
			return
		case t := <-ticker.C:
			nowIST := t.In(e.loc)
			currentMin := nowIST.Hour()*60 + nowIST.Minute()
			currentSec := nowIST.Second()

			if currentSec == 0 && currentMin != lastFlushedMinute {
				if e.isMarketHours(nowIST) {
					lastFlushedMinute = currentMin
					candleTime := time.Date(nowIST.Year(), nowIST.Month(), nowIST.Day(), nowIST.Hour(), nowIST.Minute()-1, 0, 0, e.loc)
					e.flushCompletedMinute(ctx, candleTime, nowIST)
				}
			}
		}
	}
}

func (e *UniverseStreamEngine) resetPreMarketMinute() {
	e.mu.Lock()
	defer e.mu.Unlock()
	for _, s := range e.instruments {
		if s.HasTickInMinute && s.MinClose > 0 {
			s.LastClose = s.MinClose
		}
		s.HasTickInMinute = false
		s.MinOpen, s.MinHigh, s.MinLow, s.MinClose, s.MinVolume = 0, 0, 0, 0, 0
	}
}
