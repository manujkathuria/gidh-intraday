package marketdata

import (
	"context"
	"encoding/json"
	"log"
	"time"

	kitemodels "github.com/zerodha/gokiteconnect/v4/models"
	kiteticker "github.com/zerodha/gokiteconnect/v4/ticker"
)

func (e *UniverseStreamEngine) publishLiveSnapshots(ctx context.Context) {
	e.mu.RLock()
	rc := e.redisClient
	e.mu.RUnlock()

	if rc == nil {
		return
	}
	snapRaw, ok := e.LiveSnapshot()
	if !ok || snapRaw == nil {
		return
	}
	snap, ok := snapRaw.(*LiveSnapshot)
	if !ok || snap == nil {
		return
	}

	_ = rc.Set(ctx, "gidh:live:active", "true", 5*time.Second).Err()
	_ = rc.Set(ctx, "gidh:live:session_date", snap.SessionDate, 24*time.Hour).Err()

	if radarBytes, err := json.Marshal(snap); err == nil {
		_ = rc.Publish(ctx, "gidh:radar", string(radarBytes)).Err()
		_ = rc.Set(ctx, "gidh:radar:latest", string(radarBytes), 5*time.Minute).Err()
	}

	if len(snap.Sectors) > 0 {
		if secBytes, err := json.Marshal(snap.Sectors); err == nil {
			_ = rc.Publish(ctx, "gidh:sectors", string(secBytes)).Err()
		}
	}
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
