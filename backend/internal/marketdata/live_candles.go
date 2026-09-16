package marketdata

import "time"

func (e *UniverseStreamEngine) LiveCandles(symbol string) (any, bool) {
	if e == nil {
		return nil, false
	}
	e.mu.RLock()
	defer e.mu.RUnlock()

	token, ok := e.symbolToToken[symbol]
	if !ok {
		return nil, false
	}
	state, ok := e.instruments[token]
	if !ok {
		return nil, false
	}

	candles := append([]LiveCandle(nil), state.Candles...)
	if state.HasTickInMinute && state.MinOpen > 0 {
		now := time.Now().In(e.loc)
		candleTime := time.Date(now.Year(), now.Month(), now.Day(), now.Hour(), now.Minute(), 0, 0, e.loc)
		candles = append(candles, LiveCandle{
			Time:   candleTime.Unix(),
			Open:   state.MinOpen,
			High:   state.MinHigh,
			Low:    state.MinLow,
			Close:  state.MinClose,
			Volume: state.MinVolume,
			VWAP:   liveVWAP(state, state.MinClose),
		})
	}
	return candles, true
}
