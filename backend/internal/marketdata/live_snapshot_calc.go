package marketdata

import (
	"math"
	"time"
)

func liveRVOL(state *InstrumentState, now time.Time) float64 {
	if state.ExpectedVolMap == nil {
		return 0
	}
	minSinceOpen := int16(now.Hour()*60 + now.Minute() - 555)
	if minSinceOpen < 0 {
		minSinceOpen = 0
	}
	expected := state.ExpectedVolMap[minSinceOpen]
	if expected <= 0 {
		return 0
	}
	return float64(state.CumVolume+state.MinVolume) / float64(expected)
}

func liveVWAP(state *InstrumentState, fallback float64) float64 {
	if state.CumVolume <= 0 {
		return fallback
	}
	return state.CumTurnover / float64(state.CumVolume)
}

func liveVWAPAndBands(state *InstrumentState, fallback float64) (vwap, u1, l1, u2, l2 float64) {
	if state.CumVolume <= 0 {
		return fallback, fallback, fallback, fallback, fallback
	}
	vwap = state.CumTurnover / float64(state.CumVolume)
	variance := math.Max(0, (state.CumSqTurnover/float64(state.CumVolume))-(vwap*vwap))
	sigma := math.Sqrt(variance)
	return vwap, vwap + sigma, vwap - sigma, vwap + 2*sigma, vwap - 2*sigma
}


func pct(value, base float64) float64 {
	if value <= 0 || base <= 0 {
		return 0
	}
	return (value - base) / base * 100
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

func round1(v float64) float64 {
	return math.Round(v*10) / 10
}
