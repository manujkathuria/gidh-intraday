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
		vwap, u1, l1, u2, l2 := liveVWAPAndBands(state, state.MinClose)
		candles = append(candles, LiveCandle{
			Time:       candleTime.Unix(),
			Open:       state.MinOpen,
			High:       state.MinHigh,
			Low:        state.MinLow,
			Close:      state.MinClose,
			Volume:     state.MinVolume,
			VWAP:       vwap,
			VWAPUpper1: u1,
			VWAPLower1: l1,
			VWAPUpper2: u2,
			VWAPLower2: l2,
			RVOL:       liveRVOL(state, now),
		})
	}
	return candles, true
}
