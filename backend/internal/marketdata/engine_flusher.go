package marketdata

import (
	"context"
	"math"
	"time"

	"gidh-intraday/backend/internal/store"
)

func (e *UniverseStreamEngine) runMinuteFlusher(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	lastFlushedMinute := -1

	for {
		select {
		case <-ctx.Done():
			return
		case t := <-ticker.C:
			nowIST := t.In(e.loc)
			currentMin := nowIST.Hour()*60 + nowIST.Minute()
			currentSec := nowIST.Second()

			if currentSec == 0 && currentMin != lastFlushedMinute {
				if e.isMarketHours(nowIST) {
					lastFlushedMinute = currentMin
					candleTime := time.Date(nowIST.Year(), nowIST.Month(), nowIST.Day(), nowIST.Hour(), nowIST.Minute()-1, 0, 0, e.loc)
					e.flushCompletedMinute(ctx, candleTime, nowIST)
				}
			}
		}
	}
}

func (e *UniverseStreamEngine) flushCompletedMinute(ctx context.Context, candleTime, nowIST time.Time) {
	start := time.Now()
	minutesSinceOpen := int16(candleTime.Hour()*60 + candleTime.Minute() - 555)
	if minutesSinceOpen < 0 {
		minutesSinceOpen = 0
	}

	e.mu.Lock()
	candles := make([]store.MarketCandleWithID, 0, len(e.instruments))
	features := make([]store.IntradayFeatureRecord, 0, len(e.instruments))
	runID := e.featureRunID

	for _, s := range e.instruments {
		cOpen := s.MinOpen
		cHigh := s.MinHigh
		cLow := s.MinLow
		cClose := s.MinClose
		cVol := s.MinVolume

		if !s.HasTickInMinute {
			cOpen, cHigh, cLow, cClose, cVol = s.LastClose, s.LastClose, s.LastClose, s.LastClose, 0
		}
		if cOpen <= 0 {
			cOpen, cHigh, cLow, cClose = s.PriorClose, s.PriorClose, s.PriorClose, s.PriorClose
		}

		if !s.HasSessionOpen {
			s.HasSessionOpen = true
			s.SessionOpen, s.SessionHigh, s.SessionLow = cOpen, cHigh, cLow
		} else {
			s.SessionHigh = math.Max(s.SessionHigh, cHigh)
			s.SessionLow = math.Min(s.SessionLow, cLow)
		}

		s.CumVolume += cVol
		s.CumTurnover += cClose * float64(cVol)
		s.CumSqTurnover += cClose * cClose * float64(cVol)

		if minutesSinceOpen < 15 {
			if s.OR15High == nil || cHigh > *s.OR15High {
				val := cHigh
				s.OR15High = &val
			}
			if s.OR15Low == nil || cLow < *s.OR15Low {
				val := cLow
				s.OR15Low = &val
			}
		}
		if minutesSinceOpen < 30 {
			if s.OR30High == nil || cHigh > *s.OR30High {
				val := cHigh
				s.OR30High = &val
			}
			if s.OR30Low == nil || cLow < *s.OR30Low {
				val := cLow
				s.OR30Low = &val
			}
		}

		if s.LastClose > 0 && cClose > 0 {
			lr := math.Log(cClose / s.LastClose)
			s.LogReturns = append(s.LogReturns, lr)
			if len(s.LogReturns) > 30 {
				s.LogReturns = s.LogReturns[1:]
			}
		}
		s.LastClose = cClose

		s.HasTickInMinute = false
		s.MinOpen, s.MinHigh, s.MinLow, s.MinClose, s.MinVolume = 0, 0, 0, 0, 0

		candle := store.MarketCandle{
			Timestamp: candleTime,
			Open:      cOpen,
			High:      cHigh,
			Low:       cLow,
			Close:     cClose,
			Volume:    cVol,
		}
		candles = append(candles, store.MarketCandleWithID{
			InstrumentID: s.InstrumentID,
			Candle:       candle,
		})
		vwap, u1, l1, u2, l2 := liveVWAPAndBands(s, cClose)
		feat := e.calculateFeatures(s, candleTime, cOpen, cHigh, cLow, cClose, cVol, minutesSinceOpen, runID)
		features = append(features, feat)

		var barRVOL float64
		if feat.RelativeVolume != nil {
			barRVOL = *feat.RelativeVolume
		}

		s.Candles = append(s.Candles, LiveCandle{
			Time:       candleTime.Unix(),
			Open:       cOpen,
			High:       cHigh,
			Low:        cLow,
			Close:      cClose,
			Volume:     cVol,
			VWAP:       vwap,
			VWAPUpper1: u1,
			VWAPLower1: l1,
			VWAPUpper2: u2,
			VWAPLower2: l2,
			RVOL:       barRVOL,
		})
		if len(s.Candles) > 390 {
			s.Candles = s.Candles[len(s.Candles)-390:]
		}
	}
	e.mu.Unlock()

	e.commitFlushedMinute(candles, features, runID, start, candleTime.Format("15:04:05"))
}
