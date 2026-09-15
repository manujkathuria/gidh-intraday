package marketdata

import (
	"math"
	"sort"
	"time"
)

type LiveStock struct {
	Symbol      string  `json:"symbol"`
	Sector      string  `json:"sector"`
	Price       float64 `json:"price"`
	GapPct      float64 `json:"gap_pct"`
	MovePct     float64 `json:"move_pct"`
	VWAP        float64 `json:"vwap"`
	VWAPDistPct float64 `json:"vwap_dist_pct"`
	RVOL        float64 `json:"rvol"`
	CLV         float64 `json:"clv"`
	Volume      int64   `json:"volume"`
	IsAboveVWAP bool    `json:"is_above_vwap"`
}

type LiveSector struct {
	Sector       string  `json:"sector"`
	CivCount     int     `json:"civ_count"`
	AvgMovePct   float64 `json:"avg_move_pct"`
	AvgRVOL      float64 `json:"avg_rvol"`
	PctAboveVWAP float64 `json:"pct_above_vwap"`
}

type LiveWeather struct {
	TotalCivs    int     `json:"total_civs"`
	AboveVWAP    int     `json:"above_vwap"`
	BelowVWAP    int     `json:"below_vwap"`
	PctAboveVWAP float64 `json:"pct_above_vwap"`
}

type LiveSnapshot struct {
	SessionDate string       `json:"session_date"`
	AsOfTime    string       `json:"as_of_time"`
	Weather     LiveWeather  `json:"weather"`
	Stocks      []LiveStock  `json:"stocks"`
	Sectors     []LiveSector `json:"sectors"`
	Traps       []any        `json:"traps"`
}

type LiveCandle struct {
	Time   int64   `json:"time"`
	Open   float64 `json:"open"`
	High   float64 `json:"high"`
	Low    float64 `json:"low"`
	Close  float64 `json:"close"`
	Volume int64   `json:"volume"`
	VWAP   float64 `json:"vwap"`
}

func (e *UniverseStreamEngine) LiveSnapshot() (any, bool) {
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

func (e *UniverseStreamEngine) LiveCandles(symbol string) (any, bool) {
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
