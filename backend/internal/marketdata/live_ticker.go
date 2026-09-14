package marketdata

import (
	"log"
	"sync"
	"time"

	kitemodels "github.com/zerodha/gokiteconnect/v4/models"
	kiteticker "github.com/zerodha/gokiteconnect/v4/ticker"
)

type ActivePositionTracker struct {
	ticker        *kiteticker.Ticker
	apiKey        string
	accessToken   string
	mu            sync.RWMutex
	subscribed    map[uint32]string // token -> symbol
	lastTicks     map[string]kitemodels.Tick
	onTickHandler func(symbol string, tick kitemodels.Tick)
}

func NewActivePositionTracker(apiKey, accessToken string) *ActivePositionTracker {
	return &ActivePositionTracker{
		apiKey:      apiKey,
		accessToken: accessToken,
		subscribed:  make(map[uint32]string),
		lastTicks:   make(map[string]kitemodels.Tick),
	}
}

func (t *ActivePositionTracker) SetOnTickHandler(fn func(symbol string, tick kitemodels.Tick)) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.onTickHandler = fn
}

func (t *ActivePositionTracker) Start() error {
	t.ticker = kiteticker.New(t.apiKey, t.accessToken)

	t.ticker.OnConnect(func() {
		log.Println("[WEBSOCKET TICKER] Connected to Zerodha Kite Ticker Stream.")
		t.mu.RLock()
		defer t.mu.RUnlock()
		if len(t.subscribed) > 0 {
			var tokens []uint32
			for tok := range t.subscribed {
				tokens = append(tokens, tok)
			}
			t.ticker.Subscribe(tokens)
			t.ticker.SetMode(kiteticker.ModeFull, tokens)
			log.Printf("[WEBSOCKET TICKER] Subscribed to %d active position tokens", len(tokens))
		}
	})

	t.ticker.OnError(func(err error) {
		log.Printf("[WEBSOCKET TICKER ERROR] %v", err)
	})

	t.ticker.OnClose(func(code int, reason string) {
		log.Printf("[WEBSOCKET TICKER CLOSED] code=%d, reason=%s", code, reason)
	})

	t.ticker.OnReconnect(func(attempt int, delay time.Duration) {
		log.Printf("[WEBSOCKET TICKER RECONNECTING] attempt=%d, delay=%v", attempt, delay)
	})

	t.ticker.OnTick(func(tick kitemodels.Tick) {
		t.mu.Lock()
		sym, exists := t.subscribed[tick.InstrumentToken]
		if exists {
			t.lastTicks[sym] = tick
		}
		handler := t.onTickHandler
		t.mu.Unlock()

		if exists && handler != nil {
			handler(sym, tick)
		}
	})

	go t.ticker.Serve()
	return nil
}

func (t *ActivePositionTracker) SubscribePosition(symbol string, token uint32) {
	t.mu.Lock()
	defer t.mu.Unlock()

	t.subscribed[token] = symbol
	if t.ticker != nil {
		t.ticker.Subscribe([]uint32{token})
		t.ticker.SetMode(kiteticker.ModeFull, []uint32{token})
		log.Printf("[WEBSOCKET TICKER] Subscribed active trade: %s (Token: %d)", symbol, token)
	}
}

func (t *ActivePositionTracker) UnsubscribePosition(token uint32) {
	t.mu.Lock()
	defer t.mu.Unlock()

	delete(t.subscribed, token)
	if t.ticker != nil {
		t.ticker.Unsubscribe([]uint32{token})
		log.Printf("[WEBSOCKET TICKER] Unsubscribed token: %d", token)
	}
}

func (t *ActivePositionTracker) GetLatestTick(symbol string) (kitemodels.Tick, bool) {
	t.mu.RLock()
	defer t.mu.RUnlock()
	tick, ok := t.lastTicks[symbol]
	return tick, ok
}

func (t *ActivePositionTracker) Stop() {
	if t.ticker != nil {
		t.ticker.Close()
	}
}
