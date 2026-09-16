package marketdata

import (
	"context"
	"fmt"
	"log"
	"math"

	"gidh-intraday/backend/internal/store"
)

func (e *UniverseStreamEngine) Hydrate(ctx context.Context, todayStr string) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.sessionDate = todayStr

	instList, err := e.instrumentRepo.GetActiveInstruments(ctx)
	if err != nil {
		return fmt.Errorf("failed to fetch active instruments: %w", err)
	}

	runID, baselines, err := e.dailyFeatureRepo.LoadTodayBaselines(ctx, todayStr)
	if err != nil {
		log.Printf("[UNIVERSE ENGINE WARN] LoadTodayBaselines: %v. Running with fallback defaults.", err)
	}
	e.featureRunID = runID

	expVolProfile, err := e.dailyFeatureRepo.LoadExpectedVolumeProfile(ctx, todayStr)
	if err != nil {
		log.Printf("[UNIVERSE ENGINE WARN] LoadExpectedVolumeProfile: %v", err)
	}

	for _, inst := range instList {
		token := uint32(inst.CashToken)
		b := baselines[inst.ID]

		state := &InstrumentState{
			InstrumentID:   inst.ID,
			Symbol:         inst.Symbol,
			Exchange:       inst.Exchange,
			CashToken:      token,
			PriorClose:     b.PriorClose,
			ATR14:          b.ATR14,
			ADR20:          b.ADR20,
			ExpectedVolMap: expVolProfile[inst.ID],
			LogReturns:     make([]float64, 0, 30),
			LastClose:      b.PriorClose,
		}
		e.instruments[token] = state
		e.symbolToToken[inst.Symbol] = token
	}

	todayCandles, err := e.dailyFeatureRepo.LoadTodayCandles(ctx, todayStr)
	if err == nil && len(todayCandles) > 0 {
		e.hydrateCandles(todayCandles)
	}

	log.Printf("[UNIVERSE ENGINE] Initialized for %d active universe instruments (RunID: %s)", len(e.instruments), e.featureRunID)
	return nil
}

func (e *UniverseStreamEngine) hydrateCandles(todayCandles map[int64][]store.MarketCandle) {
	hydratedBars := 0
	for _, state := range e.instruments {
		bars := todayCandles[state.InstrumentID]
		if len(bars) == 0 {
			continue
		}
		for idx, c := range bars {
			if !state.HasSessionOpen {
				state.HasSessionOpen = true
				state.SessionOpen = c.Open
				state.SessionHigh = c.High
				state.SessionLow = c.Low
			} else {
				state.SessionHigh = math.Max(state.SessionHigh, c.High)
				state.SessionLow = math.Min(state.SessionLow, c.Low)
			}
			state.CumVolume += c.Volume
			state.CumTurnover += c.Close * float64(c.Volume)
			state.CumSqTurnover += c.Close * c.Close * float64(c.Volume)

			if idx < 15 {
				if state.OR15High == nil || c.High > *state.OR15High {
					val := c.High
					state.OR15High = &val
				}
				if state.OR15Low == nil || c.Low < *state.OR15Low {
					val := c.Low
					state.OR15Low = &val
				}
			}
			if idx < 30 {
				if state.OR30High == nil || c.High > *state.OR30High {
					val := c.High
					state.OR30High = &val
				}
				if state.OR30Low == nil || c.Low < *state.OR30Low {
					val := c.Low
					state.OR30Low = &val
				}
			}

			if state.LastClose > 0 && c.Close > 0 {
				lr := math.Log(c.Close / state.LastClose)
				state.LogReturns = append(state.LogReturns, lr)
				if len(state.LogReturns) > 30 {
					state.LogReturns = state.LogReturns[1:]
				}
			}
			state.LastClose = c.Close
			state.Candles = append(state.Candles, LiveCandle{
				Time:   c.Timestamp.Unix(),
				Open:   c.Open,
				High:   c.High,
				Low:    c.Low,
				Close:  c.Close,
				Volume: c.Volume,
				VWAP:   liveVWAP(state, c.Close),
			})
			hydratedBars++
		}
	}
	log.Printf("[UNIVERSE ENGINE] Successfully hydrated %d historical 1m bars from today's session.", hydratedBars)
}
