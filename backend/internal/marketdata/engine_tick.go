package marketdata

import (
	"log"
	"math"

	kitemodels "github.com/zerodha/gokiteconnect/v4/models"
	kiteticker "github.com/zerodha/gokiteconnect/v4/ticker"
)

func (e *UniverseStreamEngine) SetSectorResolver(resolve func(symbol string) string) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.sectorResolver = resolve
}

func (e *UniverseStreamEngine) RegisterTickListener(listener func(symbol string, tick kitemodels.Tick)) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.tickListeners = append(e.tickListeners, listener)
}

func (e *UniverseStreamEngine) SubscribeDynamicToken(token uint32, symbol string) {
	e.mu.Lock()
	defer e.mu.Unlock()
	if _, exists := e.instruments[token]; !exists {
		e.instruments[token] = &InstrumentState{
			CashToken:  token,
			Symbol:     symbol,
			LogReturns: make([]float64, 0, 40),
		}
		e.symbolToToken[symbol] = token
		if e.ticker != nil && e.isRunning {
			e.ticker.Subscribe([]uint32{token})
			e.ticker.SetMode(kiteticker.ModeQuote, []uint32{token})
			log.Printf("[UNIVERSE WEBSOCKET] Dynamically subscribed additional token: %s (%d)", symbol, token)
		}
	}
}

func (e *UniverseStreamEngine) handleTick(tick kitemodels.Tick) {
	e.mu.Lock()
	state, exists := e.instruments[tick.InstrumentToken]
	if exists {
		price := tick.LastPrice
		if price > 0 {
			if !state.HasTickInMinute {
				state.HasTickInMinute = true
				state.MinOpen = price
				state.MinHigh = price
				state.MinLow = price
				state.MinClose = price
			} else {
				state.MinHigh = math.Max(state.MinHigh, price)
				state.MinLow = math.Min(state.MinLow, price)
				state.MinClose = price
			}

			// Calculate incremental volume
			if state.LastDayCashVol > 0 && int64(tick.VolumeTraded) >= state.LastDayCashVol {
				delta := int64(tick.VolumeTraded) - state.LastDayCashVol
				state.MinVolume += delta
			}
			state.LastDayCashVol = int64(tick.VolumeTraded)
		}
	}
	listeners := e.tickListeners
	e.mu.Unlock()

	if exists {
		for _, fn := range listeners {
			fn(state.Symbol, tick)
		}
	}
}

func (e *UniverseStreamEngine) GetLatestTick(symbol string) (kitemodels.Tick, bool) {
	e.mu.RLock()
	defer e.mu.RUnlock()
	tok, ok := e.symbolToToken[symbol]
	if !ok {
		return kitemodels.Tick{}, false
	}
	s, ok := e.instruments[tok]
	if !ok || s.LastClose <= 0 {
		return kitemodels.Tick{}, false
	}
	return kitemodels.Tick{
		InstrumentToken: tok,
		LastPrice:       s.LastClose,
		VolumeTraded:    uint32(s.LastDayCashVol),
	}, true
}
