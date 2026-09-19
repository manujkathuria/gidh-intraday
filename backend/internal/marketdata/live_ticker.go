package marketdata

import (
	"sync"

	kitemodels "github.com/zerodha/gokiteconnect/v4/models"
)

type ActivePositionTracker struct {
	universeEngine *UniverseStreamEngine
	mu             sync.RWMutex
	lastTicks      map[string]kitemodels.Tick
	onTickHandler  func(symbol string, tick kitemodels.Tick)
}

func NewActivePositionTracker() *ActivePositionTracker {
	return &ActivePositionTracker{
		lastTicks: make(map[string]kitemodels.Tick),
	}
}

func (t *ActivePositionTracker) SetOnTickHandler(fn func(symbol string, tick kitemodels.Tick)) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.onTickHandler = fn
}

func (t *ActivePositionTracker) AttachUniverseEngine(engine *UniverseStreamEngine) {
	t.mu.Lock()
	t.universeEngine = engine
	t.mu.Unlock()

	engine.RegisterTickListener(func(symbol string, tick kitemodels.Tick) {
		t.mu.Lock()
		t.lastTicks[symbol] = tick
		handler := t.onTickHandler
		t.mu.Unlock()

		if handler != nil {
			handler(symbol, tick)
		}
	})
}

func (t *ActivePositionTracker) GetLatestTick(symbol string) (kitemodels.Tick, bool) {
	t.mu.RLock()
	defer t.mu.RUnlock()
	tick, ok := t.lastTicks[symbol]
	return tick, ok
}

