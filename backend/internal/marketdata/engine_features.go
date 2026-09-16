package marketdata

import (
	"math"
	"time"

	"gidh-intraday/backend/internal/store"
)

func (e *UniverseStreamEngine) calculateFeatures(
	s *InstrumentState,
	candleTime time.Time,
	cOpen, cHigh, cLow, cClose float64,
	cVol int64,
	minSinceOpen int16,
	runID string,
) store.IntradayFeatureRecord {
	barRange := cHigh - cLow
	barBody := cClose - cOpen

	var clv, upperWick, lowerWick *float64
	if barRange > 0 {
		cVal := (cClose - cLow) / barRange
		uVal := (cHigh - math.Max(cOpen, cClose)) / barRange
		lVal := (math.Min(cOpen, cClose) - cLow) / barRange
		clv, upperWick, lowerWick = &cVal, &uVal, &lVal
	}

	var sessionVWAP, vwapSigma, vwapUpper1, vwapLower1, vwapUpper2, vwapLower2, vwapDistSigma *float64
	if s.CumVolume > 0 {
		vwap := s.CumTurnover / float64(s.CumVolume)
		variance := math.Max(0, (s.CumSqTurnover/float64(s.CumVolume))-(vwap*vwap))
		sigma := math.Sqrt(variance)
		u1, l1 := vwap+sigma, vwap-sigma
		u2, l2 := vwap+2*sigma, vwap-2*sigma

		sessionVWAP, vwapSigma = &vwap, &sigma
		vwapUpper1, vwapLower1 = &u1, &l1
		vwapUpper2, vwapLower2 = &u2, &l2

		if sigma > 0 {
			dist := (cClose - vwap) / sigma
			vwapDistSigma = &dist
		}
	}

	var expCumVol *int64
	var rvol *float64
	if s.ExpectedVolMap != nil {
		if ev, ok := s.ExpectedVolMap[minSinceOpen]; ok && ev > 0 {
			expCumVol = &ev
			rv := float64(s.CumVolume) / float64(ev)
			rvol = &rv
		}
	}

	rVol5 := computeStdDev(s.LogReturns, 5)
	rVol15 := computeStdDev(s.LogReturns, 15)
	rVol30 := computeStdDev(s.LogReturns, 30)

	var sessionRangeATR, adrFuelUsed *float64
	sessionRange := s.SessionHigh - s.SessionLow
	if s.ATR14 > 0 {
		val := sessionRange / s.ATR14
		sessionRangeATR = &val
	}
	if s.ADR20 > 0 {
		val := sessionRange / s.ADR20
		adrFuelUsed = &val
	}

	var or15H, or15L, or30H, or30L *float64
	if minSinceOpen >= 14 && s.OR15High != nil {
		or15H, or15L = s.OR15High, s.OR15Low
	}
	if minSinceOpen >= 29 && s.OR30High != nil {
		or30H, or30L = s.OR30High, s.OR30Low
	}

	return store.IntradayFeatureRecord{
		Timestamp:             candleTime,
		FeatureRunID:          runID,
		InstrumentID:          s.InstrumentID,
		CashSourceTS:          candleTime,
		CashIsComplete:        true,
		FutureIsComplete:      false,
		CashOpen:              cOpen,
		CashHigh:              cHigh,
		CashLow:               cLow,
		CashClose:             cClose,
		SessionOpen:           s.SessionOpen,
		SessionHigh:           s.SessionHigh,
		SessionLow:            s.SessionLow,
		MinutesSinceOpen:      minSinceOpen,
		OpeningRange15High:    or15H,
		OpeningRange15Low:     or15L,
		OpeningRange30High:    or30H,
		OpeningRange30Low:     or30L,
		SessionVWAP:           sessionVWAP,
		VWAPSigma:             vwapSigma,
		VWAPUpper1:            vwapUpper1,
		VWAPLower1:            vwapLower1,
		VWAPUpper2:            vwapUpper2,
		VWAPLower2:            vwapLower2,
		VWAPDistanceSigma:     vwapDistSigma,
		BarRange:              barRange,
		BarBody:               barBody,
		CLV:                   clv,
		UpperWickPct:          upperWick,
		LowerWickPct:          lowerWick,
		CumulativeVolume:      s.CumVolume,
		ExpectedCumulativeVol: expCumVol,
		RelativeVolume:        rvol,
		RealisedVolatility5M:  rVol5,
		RealisedVolatility15M: rVol15,
		RealisedVolatility30M: rVol30,
		SessionRangePctATR:    sessionRangeATR,
		ADRFuelUsedPct:        adrFuelUsed,
	}
}
