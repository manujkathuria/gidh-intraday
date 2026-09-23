package marketdata

import (
	"context"
	"time"
)

func (e *UniverseStreamEngine) isMarketHours(nowIST time.Time) bool {
	if nowIST.Weekday() == time.Saturday || nowIST.Weekday() == time.Sunday {
		return false
	}
	minOfDay := nowIST.Hour()*60 + nowIST.Minute()
	return minOfDay >= 550 && minOfDay <= 930
}

func (e *UniverseStreamEngine) Start(ctx context.Context) error {
	e.isRunning = true
	go e.runMarketLifecycle(ctx)
	go e.runMinuteFlusher(ctx)
	go e.runRedisPublisher(ctx)
	return nil
}

func (e *UniverseStreamEngine) runRedisPublisher(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			e.publishLiveSnapshots(ctx)
		}
	}
}

func (e *UniverseStreamEngine) Stop() {
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.ticker != nil {
		e.ticker.Close()
		e.ticker = nil
	}
}
