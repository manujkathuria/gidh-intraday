package marketdata

import (
	"context"
	"fmt"
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
	nowIST := time.Now().In(e.loc)
	todayStr := nowIST.Format("2006-01-02")

	if err := e.Hydrate(ctx, todayStr); err != nil {
		return fmt.Errorf("engine hydration error: %w", err)
	}

	e.ticker = kiteticker.New(e.apiKey, e.accessToken)

	e.ticker.OnConnect(func() {
		log.Println("[UNIVERSE WEBSOCKET] Connected to Zerodha Kite Ticker Stream.")
		e.mu.RLock()
		defer e.mu.RUnlock()

		tokens := make([]uint32, 0, len(e.instruments))
		for tok := range e.instruments {
			tokens = append(tokens, tok)
		}

		if len(tokens) > 0 {
			e.ticker.Subscribe(tokens)
			e.ticker.SetMode(kiteticker.ModeQuote, tokens)
			log.Printf("[UNIVERSE WEBSOCKET] Subscribed to %d universe tokens (ModeQuote)", len(tokens))
		}
	})

	e.ticker.OnError(func(err error) {
		log.Printf("[UNIVERSE WEBSOCKET ERROR] %v", err)
	})

	e.ticker.OnClose(func(code int, reason string) {
		log.Printf("[UNIVERSE WEBSOCKET CLOSED] code=%d, reason=%s", code, reason)
	})

	e.ticker.OnReconnect(func(attempt int, delay time.Duration) {
		log.Printf("[UNIVERSE WEBSOCKET RECONNECTING] attempt=%d, delay=%v", attempt, delay)
	})

	e.ticker.OnTick(func(tick kitemodels.Tick) {
		e.handleTick(tick)
	})

	e.isRunning = true
	go e.ticker.Serve()
	go e.runMinuteFlusher(ctx)

	log.Println("[UNIVERSE ENGINE] Real-time 210-stock WebSocket aggregator and 47-feature calculator ACTIVE.")
	return nil
}

func (e *UniverseStreamEngine) Stop() {
	if e.ticker != nil {
		e.ticker.Close()
	}
	e.isRunning = false
}
