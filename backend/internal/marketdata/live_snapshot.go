package marketdata

import (
	"sort"
	"time"
)

func (e *UniverseStreamEngine) LiveSnapshot() (any, bool) {
	if e == nil {
		return nil, false
	}
	e.mu.RLock()
	defer e.mu.RUnlock()

	if e.sessionDate == "" || len(e.instruments) == 0 {
		return nil, false
	}

	now := time.Now().In(e.loc)
	stocks := make([]LiveStock, 0, len(e.instruments))
	aboveCount := 0
	sectorStats := map[string]*struct {
		count      int
		sumMove    float64
		sumRVOL    float64
		aboveCount int
	}{}

	for _, state := range e.instruments {
		price := state.LastClose
		if state.HasTickInMinute && state.MinClose > 0 {
			price = state.MinClose
		}
		if price <= 0 {
			price = state.PriorClose
		}

		vwap := 0.0
		if state.CumVolume > 0 {
			vwap = state.CumTurnover / float64(state.CumVolume)
		}
		if vwap <= 0 {
			vwap = price
		}

		movePct := pct(price, state.PriorClose)
		gapPct := pct(state.SessionOpen, state.PriorClose)
		vwapDistPct := pct(price, vwap)
		rvol := liveRVOL(state, now)
		clv := 0.5
		if state.SessionHigh > state.SessionLow {
			clv = (price - state.SessionLow) / (state.SessionHigh - state.SessionLow)
		}
		sector := "OTHERS"
		if e.sectorResolver != nil {
			sector = e.sectorResolver(state.Symbol)
		}
		isAboveVWAP := vwapDistPct >= 0
		if isAboveVWAP {
			aboveCount++
		}

		stocks = append(stocks, LiveStock{
			Symbol:      state.Symbol,
			Sector:      sector,
			Price:       round2(price),
			GapPct:      round2(gapPct),
			MovePct:     round2(movePct),
			VWAP:        round2(vwap),
			VWAPDistPct: round2(vwapDistPct),
			RVOL:        round2(rvol),
			CLV:         round2(clv),
			Volume:      state.CumVolume + state.MinVolume,
			IsAboveVWAP: isAboveVWAP,
		})

		stats := sectorStats[sector]
		if stats == nil {
			stats = &struct {
				count      int
				sumMove    float64
				sumRVOL    float64
				aboveCount int
			}{}
			sectorStats[sector] = stats
		}
		stats.count++
		stats.sumMove += movePct
		stats.sumRVOL += rvol
		if isAboveVWAP {
			stats.aboveCount++
		}
	}

	sort.Slice(stocks, func(i, j int) bool {
		return stocks[i].RVOL > stocks[j].RVOL
	})

	sectors := make([]LiveSector, 0, len(sectorStats))
	for sector, stats := range sectorStats {
		sectors = append(sectors, LiveSector{
			Sector:       sector,
			CivCount:     stats.count,
			AvgMovePct:   round2(stats.sumMove / float64(stats.count)),
			AvgRVOL:      round2(stats.sumRVOL / float64(stats.count)),
			PctAboveVWAP: round1(float64(stats.aboveCount) / float64(stats.count) * 100),
		})
	}
	sort.Slice(sectors, func(i, j int) bool {
		return sectors[i].AvgMovePct > sectors[j].AvgMovePct
	})

	total := len(stocks)
	return &LiveSnapshot{
		SessionDate: e.sessionDate,
		AsOfTime:    now.Format("15:04:05"),
		Weather: LiveWeather{
			TotalCivs:    total,
			AboveVWAP:    aboveCount,
			BelowVWAP:    total - aboveCount,
			PctAboveVWAP: round1(float64(aboveCount) / float64(total) * 100),
		},
		Stocks:  stocks,
		Sectors: sectors,
		Traps:   []any{},
	}, true
}
