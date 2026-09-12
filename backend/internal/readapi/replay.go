package readapi

import (
	"context"
	"fmt"
	"math"
	"sort"
)

type ReplayStock struct {
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

type ReplaySector struct {
	Sector       string  `json:"sector"`
	CivCount     int     `json:"civ_count"`
	AvgMovePct   float64 `json:"avg_move_pct"`
	AvgRVOL      float64 `json:"avg_rvol"`
	PctAboveVWAP float64 `json:"pct_above_vwap"`
}

type ReplayTrap struct {
	Symbol      string  `json:"symbol"`
	Sector      string  `json:"sector"`
	TrapType    string  `json:"trap_type"`
	Confidence  string  `json:"confidence"`
	Description string  `json:"description"`
	MovePct     float64 `json:"move_pct"`
	GapPct      float64 `json:"gap_pct"`
	RVOL        float64 `json:"rvol"`
	CLV         float64 `json:"clv"`
}

type ReplayWeather struct {
	TotalCivs     int     `json:"total_civs"`
	AboveVWAP     int     `json:"above_vwap"`
	BelowVWAP     int     `json:"below_vwap"`
	PctAboveVWAP  float64 `json:"pct_above_vwap"`
}

type ReplaySnapshotResponse struct {
	SessionDate string         `json:"session_date"`
	AsOfTime    string         `json:"as_of_time"`
	Weather     ReplayWeather  `json:"weather"`
	Stocks      []ReplayStock  `json:"stocks"`
	Sectors     []ReplaySector `json:"sectors"`
	Traps       []ReplayTrap   `json:"traps"`
}

type ReplayCandle struct {
	Time   int64   `json:"time"`
	Open   float64 `json:"open"`
	High   float64 `json:"high"`
	Low    float64 `json:"low"`
	Close  float64 `json:"close"`
	Volume int64   `json:"volume"`
	VWAP   float64 `json:"vwap"`
}

func (r *Repository) ReplaySnapshot(ctx context.Context, sessionDate, asOfTime string) (*ReplaySnapshotResponse, error) {
	query := `
	WITH prev_date AS (
		SELECT DISTINCT date(ts AT TIME ZONE 'Asia/Kolkata') as dt
		FROM market.cash_candles_1m
		WHERE (ts AT TIME ZONE 'Asia/Kolkata')::date < $1::date
		ORDER BY dt DESC LIMIT 1
	),
	prev_close AS (
		SELECT i.symbol, c.close as prev_close
		FROM market.cash_candles_1m c 
		JOIN market.instruments i ON c.instrument_id = i.id
		WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = (SELECT dt FROM prev_date)
		  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time >= '15:29:00'
		  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time <= '15:30:00'
	),
	open_candle AS (
		SELECT i.symbol, MIN(c.open) as day_open
		FROM market.cash_candles_1m c 
		JOIN market.instruments i ON c.instrument_id = i.id
		WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = $1::date
		  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time >= '09:15:00'
		  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time <= '09:16:00'
		GROUP BY i.symbol
	),
	current_bars AS (
		SELECT i.symbol,
			(ARRAY_AGG(c.close ORDER BY c.ts DESC))[1] as current_price,
			SUM(c.volume) as current_vol,
			MIN(c.low) as low_scout,
			MAX(c.high) as high_scout,
			SUM(c.close * c.volume) / NULLIF(SUM(c.volume), 0) as vwap_scout
		FROM market.cash_candles_1m c 
		JOIN market.instruments i ON c.instrument_id = i.id
		WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = $1::date
		  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time >= '09:15:00'
		  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time <= $2::time
		GROUP BY i.symbol
	),
	hist_vol AS (
		SELECT i.symbol, AVG(sub.vol_window) as avg_vol_hist
		FROM (
			SELECT instrument_id, date_trunc('day', ts AT TIME ZONE 'Asia/Kolkata') as day, SUM(volume) as vol_window
			FROM market.cash_candles_1m
			WHERE (ts AT TIME ZONE 'Asia/Kolkata')::time >= '09:15:00'
			  AND (ts AT TIME ZONE 'Asia/Kolkata')::time <= $2::time
			  AND (ts AT TIME ZONE 'Asia/Kolkata')::date < $1::date
			  AND (ts AT TIME ZONE 'Asia/Kolkata')::date >= ($1::date - INTERVAL '30 days')
			GROUP BY instrument_id, date_trunc('day', ts AT TIME ZONE 'Asia/Kolkata')
		) sub
		JOIN market.instruments i ON sub.instrument_id = i.id
		GROUP BY i.symbol
	)
	SELECT 
		m.symbol,
		COALESCE(ROUND(((o.day_open - p.prev_close) / p.prev_close * 100)::numeric, 2), 0) as gap_pct,
		COALESCE(ROUND(((m.current_price - p.prev_close) / p.prev_close * 100)::numeric, 2), 0) as move_pct,
		COALESCE(ROUND(((m.current_price - m.vwap_scout) / m.vwap_scout * 100)::numeric, 2), 0) as vwap_dist_pct,
		COALESCE(ROUND((m.current_vol / NULLIF(h.avg_vol_hist, 0))::numeric, 2), 1.0) as rvol,
		COALESCE(ROUND(((m.current_price - m.low_scout) / NULLIF(m.high_scout - m.low_scout, 0))::numeric, 2), 0.5) as clv,
		COALESCE(m.current_price, 0),
		COALESCE(m.vwap_scout, 0),
		COALESCE(m.current_vol, 0)
	FROM current_bars m
	LEFT JOIN prev_close p ON m.symbol = p.symbol
	LEFT JOIN open_candle o ON m.symbol = o.symbol
	LEFT JOIN hist_vol h ON m.symbol = h.symbol
	ORDER BY rvol DESC;
	`

	rows, err := r.db.Pool.Query(ctx, query, sessionDate, asOfTime)
	if err != nil {
		return nil, fmt.Errorf("query replay snapshot: %w", err)
	}
	defer rows.Close()

	stocks := []ReplayStock{}
	aboveCount := 0
	sectorStats := map[string]*struct {
		Count      int
		SumMove    float64
		SumRVOL    float64
		AboveCount int
	}{}

	for rows.Next() {
		var s ReplayStock
		if err := rows.Scan(&s.Symbol, &s.GapPct, &s.MovePct, &s.VWAPDistPct, &s.RVOL, &s.CLV, &s.Price, &s.VWAP, &s.Volume); err != nil {
			return nil, err
		}
		s.Sector = GetSector(s.Symbol)
		s.IsAboveVWAP = s.VWAPDistPct >= 0
		if s.IsAboveVWAP {
			aboveCount++
		}

		if _, exists := sectorStats[s.Sector]; !exists {
			sectorStats[s.Sector] = &struct {
				Count      int
				SumMove    float64
				SumRVOL    float64
				AboveCount int
			}{}
		}
		st := sectorStats[s.Sector]
		st.Count++
		st.SumMove += s.MovePct
		st.SumRVOL += s.RVOL
		if s.IsAboveVWAP {
			st.AboveCount++
		}

		stocks = append(stocks, s)
	}

	total := len(stocks)
	pctAbove := 0.0
	if total > 0 {
		pctAbove = math.Round((float64(aboveCount)/float64(total)*100)*10) / 10
	}

	sectors := []ReplaySector{}
	secMoveMap := map[string]float64{}
	for secName, st := range sectorStats {
		avgMove := math.Round((st.SumMove/float64(st.Count))*100) / 100
		avgRVOL := math.Round((st.SumRVOL/float64(st.Count))*100) / 100
		pctAboveSec := math.Round((float64(st.AboveCount)/float64(st.Count)*100)*10) / 10
		secMoveMap[secName] = avgMove

		sectors = append(sectors, ReplaySector{
			Sector:       secName,
			CivCount:     st.Count,
			AvgMovePct:   avgMove,
			AvgRVOL:      avgRVOL,
			PctAboveVWAP: pctAboveSec,
		})
	}
	sort.Slice(sectors, func(i, j int) bool {
		return sectors[i].AvgMovePct > sectors[j].AvgMovePct
	})

	traps := []ReplayTrap{}
	for _, s := range stocks {
		secAvg := secMoveMap[s.Sector]

		// Bull Trap (Gap & Crap)
		if s.GapPct >= 1.2 && !s.IsAboveVWAP && s.CLV <= 0.25 {
			conf := "MEDIUM"
			if s.RVOL >= 3.0 {
				conf = "HIGH"
			}
			traps = append(traps, ReplayTrap{
				Symbol:      s.Symbol,
				Sector:      s.Sector,
				TrapType:    "BULL_TRAP (Gap & Crap)",
				Confidence:  conf,
				Description: fmt.Sprintf("Gapped +%.2f%% but collapsed below VWAP (CLV: %.2f). Trapped early buyers.", s.GapPct, s.CLV),
				MovePct:     s.MovePct,
				GapPct:      s.GapPct,
				RVOL:        s.RVOL,
				CLV:         s.CLV,
			})
		} else if s.GapPct <= -1.2 && s.IsAboveVWAP && s.CLV >= 0.75 {
			conf := "MEDIUM"
			if s.RVOL >= 3.0 {
				conf = "HIGH"
			}
			traps = append(traps, ReplayTrap{
				Symbol:      s.Symbol,
				Sector:      s.Sector,
				TrapType:    "BEAR_TRAP (Flush & Squeeze)",
				Confidence:  conf,
				Description: fmt.Sprintf("Gapped %.2f%% but violently reclaimed VWAP (CLV: %.2f). Short sellers trapped.", s.GapPct, s.CLV),
				MovePct:     s.MovePct,
				GapPct:      s.GapPct,
				RVOL:        s.RVOL,
				CLV:         s.CLV,
			})
		} else if s.MovePct >= 1.8 && secAvg <= -0.5 {
			traps = append(traps, ReplayTrap{
				Symbol:      s.Symbol,
				Sector:      s.Sector,
				TrapType:    "SECTOR_DIVERGENCE_TRAP",
				Confidence:  "MEDIUM",
				Description: fmt.Sprintf("Surging +%.2f%% while %s sector is weak (%.2f%%). High fade risk.", s.MovePct, s.Sector, secAvg),
				MovePct:     s.MovePct,
				GapPct:      s.GapPct,
				RVOL:        s.RVOL,
				CLV:         s.CLV,
			})
		}
	}

	return &ReplaySnapshotResponse{
		SessionDate: sessionDate,
		AsOfTime:    asOfTime,
		Weather: ReplayWeather{
			TotalCivs:    total,
			AboveVWAP:    aboveCount,
			BelowVWAP:    total - aboveCount,
			PctAboveVWAP: pctAbove,
		},
		Stocks:  stocks,
		Sectors: sectors,
		Traps:   traps,
	}, nil
}

func (r *Repository) ReplayCandles(ctx context.Context, sessionDate, symbol, toTime string) ([]ReplayCandle, error) {
	query := `
	WITH session_bars AS (
		SELECT 
			c.ts,
			c.open,
			c.high,
			c.low,
			c.close,
			c.volume,
			SUM(c.close * c.volume) OVER (ORDER BY c.ts) / NULLIF(SUM(c.volume) OVER (ORDER BY c.ts), 0) as vwap
		FROM market.cash_candles_1m c
		JOIN market.instruments i ON c.instrument_id = i.id
		WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = $1::date
		  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time >= '09:15:00'
		  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time <= $3::time
		  AND i.symbol = $2
		ORDER BY c.ts ASC
	)
	SELECT 
		EXTRACT(EPOCH FROM ts)::bigint as time_sec,
		open, high, low, close, volume, COALESCE(vwap, close)
	FROM session_bars;
	`

	rows, err := r.db.Pool.Query(ctx, query, sessionDate, symbol, toTime)
	if err != nil {
		return nil, fmt.Errorf("query replay candles: %w", err)
	}
	defer rows.Close()

	candles := []ReplayCandle{}
	for rows.Next() {
		var c ReplayCandle
		if err := rows.Scan(&c.Time, &c.Open, &c.High, &c.Low, &c.Close, &c.Volume, &c.VWAP); err != nil {
			return nil, err
		}
		candles = append(candles, c)
	}
	return candles, nil
}
