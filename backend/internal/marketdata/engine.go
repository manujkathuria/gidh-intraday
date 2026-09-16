package marketdata

import (
	"context"
	"log"
	"time"

	kitemodels "github.com/zerodha/gokiteconnect/v4/models"
	kiteticker "github.com/zerodha/gokiteconnect/v4/ticker"
)

func (e *UniverseStreamEngine) isMarketHours(nowIST time.Time) bool {
	if nowIST.Weekday() == time.Saturday || nowIST.Weekday() == time.Sunday {
		return false
	}
	minOfDay := nowIST.Hour()*60 + nowIST.Minute()
	return minOfDay >= 555 && minOfDay <= 930
}

func (e *UniverseStreamEngine) Start(ctx context.Context) error {
	e.isRunning = true
	go e.runMarketLifecycle(ctx)
	go e.runMinuteFlusher(ctx)
	log.Println("[UNIVERSE ENGINE] Lifecycle scheduler and 47-feature calculator ACTIVE.")
	return nil
}

func (e *UniverseStreamEngine) runMarketLifecycle(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			e.Stop()
			return
		case t := <-ticker.C:
			nowIST := t.In(e.loc)
			inHours := e.isMarketHours(nowIST)

			e.mu.Lock()
			tickerActive := e.ticker != nil
			e.mu.Unlock()

			if inHours && !tickerActive {
				todayStr := nowIST.Format("2006-01-02")
				if err := e.Hydrate(ctx, todayStr); err != nil {
					log.Printf("[UNIVERSE ENGINE ERROR] Hydration error: %v", err)
				} else {
					e.connectTicker()
				}
			} else if !inHours && tickerActive {
				log.Println("[UNIVERSE ENGINE] Market closed (outside 09:15-15:30 IST). Disconnecting broker WebSocket.")
				e.Stop()
			}
		}
	}
}

func (e *UniverseStreamEngine) connectTicker() {
	e.mu.Lock()
	defer e.mu.Unlock()

	if e.ticker != nil {
		return
	}
	e.ticker = kiteticker.New(e.apiKey, e.accessToken)
	e.ticker.OnConnect(func() {
		log.Println("[UNIVERSE WEBSOCKET] Connected to Zerodha Kite Ticker Stream.")
		e.mu.RLock()
		tokens := make([]uint32, 0, len(e.instruments))
		for tok := range e.instruments {
			tokens = append(tokens, tok)
		}
		e.mu.RUnlock()

		if len(tokens) > 0 {
			e.ticker.Subscribe(tokens)
			e.ticker.SetMode(kiteticker.ModeQuote, tokens)
			log.Printf("[UNIVERSE WEBSOCKET] Subscribed to %d universe tokens (ModeQuote)", len(tokens))
		}
	})
	e.ticker.OnError(func(err error) { log.Printf("[UNIVERSE WEBSOCKET ERROR] %v", err) })
	e.ticker.OnClose(func(code int, reason string) {
		log.Printf("[UNIVERSE WEBSOCKET CLOSED] code=%d, reason=%s", code, reason)
	})
	e.ticker.OnReconnect(func(attempt int, delay time.Duration) {
		log.Printf("[UNIVERSE WEBSOCKET RECONNECTING] attempt=%d, delay=%v", attempt, delay)
	})
	e.ticker.OnTick(func(tick kitemodels.Tick) { e.handleTick(tick) })
	go e.ticker.Serve()
}

func (e *UniverseStreamEngine) Stop() {
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.ticker != nil {
		e.ticker.Close()
		e.ticker = nil
	}
}
