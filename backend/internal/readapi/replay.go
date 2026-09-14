package readapi

import (
	"context"
	"fmt"
	"math"
	"sort"
	"time"
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
	if r.redis != nil {
		if cached, ok := r.redis.GetSnapshot(ctx, sessionDate, asOfTime); ok {
			return cached, nil
		}
	}

	if asOfTime <= "09:14:00" {
		res, err := r.preopenBaseline(ctx, sessionDate, asOfTime)
		if err == nil && r.redis != nil {
			r.redis.SetSnapshot(ctx, sessionDate, asOfTime, res)
		}
		return res, err
	}

	query := `
	WITH prev_date AS (
		SELECT DISTINCT session_date as dt
		FROM market.cash_candles_1d
		WHERE session_date < $1::date
		ORDER BY dt DESC LIMIT 1
	),
	prev_close AS (
		SELECT i.symbol, c.close as prev_close
		FROM market.cash_candles_1d c
		JOIN market.instruments i ON c.instrument_id = i.id
		WHERE c.session_date = (SELECT dt FROM prev_date)
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
		SELECT i.symbol, AVG(c.volume) as avg_daily_vol
		FROM market.cash_candles_1d c
		JOIN market.instruments i ON c.instrument_id = i.id
		WHERE c.session_date < $1::date
		  AND c.session_date >= ($1::date - INTERVAL '30 days')
		GROUP BY i.symbol
	)
	SELECT 
		m.symbol,
		COALESCE(ROUND(((o.day_open - p.prev_close) / p.prev_close * 100)::numeric, 2), 0) as gap_pct,
		COALESCE(ROUND(((m.current_price - p.prev_close) / p.prev_close * 100)::numeric, 2), 0) as move_pct,
		COALESCE(ROUND(((m.current_price - m.vwap_scout) / m.vwap_scout * 100)::numeric, 2), 0) as vwap_dist_pct,
		COALESCE(ROUND((m.current_vol / NULLIF(h.avg_daily_vol, 0) * 100)::numeric, 2), 0) as rvol,
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

	res := &ReplaySnapshotResponse{
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
	}

	if r.redis != nil {
		r.redis.SetSnapshot(ctx, sessionDate, asOfTime, res)
	}

	return res, nil
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

func (r *Repository) preopenBaseline(ctx context.Context, sessionDate, asOfTime string) (*ReplaySnapshotResponse, error) {
	query := `
	WITH prev_date AS (
		SELECT DISTINCT date(ts AT TIME ZONE 'Asia/Kolkata') as dt
		FROM market.cash_candles_1m
		WHERE (ts AT TIME ZONE 'Asia/Kolkata')::date < $1::date
		ORDER BY dt DESC LIMIT 1
	)
	SELECT DISTINCT ON (i.symbol)
		i.symbol,
		c.close as prev_close
	FROM market.cash_candles_1m c 
	JOIN market.instruments i ON c.instrument_id = i.id
	WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = (SELECT dt FROM prev_date)
	ORDER BY i.symbol, c.ts DESC;
	`

	rows, err := r.db.Pool.Query(ctx, query, sessionDate)
	if err != nil {
		return nil, fmt.Errorf("query preopen baseline: %w", err)
	}
	defer rows.Close()

	stocks := []ReplayStock{}
	sectorMap := map[string]*ReplaySector{}

	for rows.Next() {
		var sym string
		var prevClose float64
		if err := rows.Scan(&sym, &prevClose); err != nil {
			return nil, err
		}
		sec := GetSector(sym)
		stocks = append(stocks, ReplayStock{
			Symbol:      sym,
			Sector:      sec,
			Price:       prevClose,
			GapPct:      0.0,
			MovePct:     0.0,
			VWAP:        prevClose,
			VWAPDistPct: 0.0,
			RVOL:        0.0,
			CLV:         0.5,
			Volume:      0,
			IsAboveVWAP: true,
		})

		if _, exists := sectorMap[sec]; !exists {
			sectorMap[sec] = &ReplaySector{
				Sector:       sec,
				CivCount:     0,
				AvgMovePct:   0.0,
				AvgRVOL:      0.0,
				PctAboveVWAP: 100.0,
			}
		}
		sectorMap[sec].CivCount++
	}

	sectors := []ReplaySector{}
	for _, s := range sectorMap {
		sectors = append(sectors, *s)
	}
	sort.Slice(sectors, func(i, j int) bool {
		return sectors[i].CivCount > sectors[j].CivCount
	})

	return &ReplaySnapshotResponse{
		SessionDate: sessionDate,
		AsOfTime:    asOfTime,
		Weather: ReplayWeather{
			TotalCivs:    len(stocks),
			AboveVWAP:    len(stocks),
			BelowVWAP:    0,
			PctAboveVWAP: 100.0,
		},
		Stocks:  stocks,
		Sectors: sectors,
		Traps:   []ReplayTrap{},
	}, nil
}

func (r *Repository) PrepopulatePreopenBaselines(ctx context.Context) error {
	if r.redis == nil {
		return nil
	}

	query := `
	WITH ranked_days AS (
		SELECT 
			c.session_date,
			i.symbol,
			c.close as prev_close
		FROM market.cash_candles_1d c
		JOIN market.instruments i ON c.instrument_id = i.id
		ORDER BY c.session_date ASC, i.symbol ASC
	)
	SELECT session_date::text, symbol, prev_close
	FROM ranked_days;
	`

	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return fmt.Errorf("query all daily closes: %w", err)
	}
	defer rows.Close()

	type stockDay struct {
		symbol    string
		prevClose float64
	}
	daysMap := map[string][]stockDay{}

	for rows.Next() {
		var sDate, sym string
		var prevClose float64
		if err := rows.Scan(&sDate, &sym, &prevClose); err != nil {
			return err
		}
		daysMap[sDate] = append(daysMap[sDate], stockDay{symbol: sym, prevClose: prevClose})
	}

	// For each session, build 09:14:00 baseline and save permanently in Redis
	for sDate, stockList := range daysMap {
		stocks := []ReplayStock{}
		sectorMap := map[string]*ReplaySector{}

		for _, s := range stockList {
			sec := GetSector(s.symbol)
			stocks = append(stocks, ReplayStock{
				Symbol:      s.symbol,
				Sector:      sec,
				Price:       s.prevClose,
				GapPct:      0.0,
				MovePct:     0.0,
				VWAP:        s.prevClose,
				VWAPDistPct: 0.0,
				RVOL:        0.0,
				CLV:         0.5,
				Volume:      0,
				IsAboveVWAP: true,
			})

			if _, exists := sectorMap[sec]; !exists {
				sectorMap[sec] = &ReplaySector{
					Sector:       sec,
					CivCount:     0,
					AvgMovePct:   0.0,
					AvgRVOL:      0.0,
					PctAboveVWAP: 100.0,
				}
			}
			sectorMap[sec].CivCount++
		}

		sectors := []ReplaySector{}
		for _, secObj := range sectorMap {
			sectors = append(sectors, *secObj)
		}
		sort.Slice(sectors, func(i, j int) bool {
			return sectors[i].CivCount > sectors[j].CivCount
		})

		snap := &ReplaySnapshotResponse{
			SessionDate: sDate,
			AsOfTime:    "09:14:00",
			Weather: ReplayWeather{
				TotalCivs:    len(stocks),
				AboveVWAP:    len(stocks),
				BelowVWAP:    0,
				PctAboveVWAP: 100.0,
			},
			Stocks:  stocks,
			Sectors: sectors,
			Traps:   []ReplayTrap{},
		}
		r.redis.SetSnapshot(ctx, sDate, "09:14:00", snap)
	}

	return nil
}

func (r *Repository) WarmSessionDay(ctx context.Context, sessionDate string) error {
	if r.redis == nil || r.redis.IsDayWarmed(ctx, sessionDate) {
		return nil
	}

	go func() {
		bgCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		// 1. Get 30-day baseline average volume & previous close for all 210 instruments
		metaQuery := `
		WITH prev_date AS (
			SELECT DISTINCT session_date as dt
			FROM market.cash_candles_1d
			WHERE session_date < $1::date
			ORDER BY dt DESC LIMIT 1
		),
		prev_close AS (
			SELECT i.symbol, c.close as prev_close
			FROM market.cash_candles_1d c
			JOIN market.instruments i ON c.instrument_id = i.id
			WHERE c.session_date = (SELECT dt FROM prev_date)
		),
		hist_vol AS (
			SELECT i.symbol, AVG(c.volume) as avg_daily_vol
			FROM market.cash_candles_1d c
			JOIN market.instruments i ON c.instrument_id = i.id
			WHERE c.session_date < $1::date
			  AND c.session_date >= ($1::date - INTERVAL '30 days')
			GROUP BY i.symbol
		)
		SELECT i.symbol, COALESCE(p.prev_close, 0), COALESCE(h.avg_daily_vol, 1)
		FROM market.instruments i
		LEFT JOIN prev_close p ON i.symbol = p.symbol
		LEFT JOIN hist_vol h ON i.symbol = h.symbol
		WHERE i.is_active;
		`

		metaRows, err := r.db.Pool.Query(bgCtx, metaQuery, sessionDate)
		if err != nil {
			return
		}

		type StockMeta struct {
			PrevClose   float64
			AvgDailyVol float64
		}
		stockMetaMap := map[string]StockMeta{}
		for metaRows.Next() {
			var sym string
			var pc, adv float64
			if err := metaRows.Scan(&sym, &pc, &adv); err == nil {
				stockMetaMap[sym] = StockMeta{PrevClose: pc, AvgDailyVol: adv}
			}
		}
		metaRows.Close()

		// 2. Fetch all 1-minute candles for the whole session in one fast 250ms query
		candlesQuery := `
		SELECT 
			i.symbol,
			c.open, c.high, c.low, c.close, c.volume,
			to_char(c.ts AT TIME ZONE 'Asia/Kolkata', 'HH24:MI:SS') as candle_time
		FROM market.cash_candles_1m c
		JOIN market.instruments i ON c.instrument_id = i.id
		WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = $1::date
		ORDER BY candle_time ASC, i.symbol ASC;
		`

		cRows, err := r.db.Pool.Query(bgCtx, candlesQuery, sessionDate)
		if err != nil {
			return
		}

		type MinBar struct {
			Symbol string
			Open   float64
			High   float64
			Low    float64
			Close  float64
			Volume int64
			Time   string
		}

		timeGroupedBars := map[string][]MinBar{}
		for cRows.Next() {
			var b MinBar
			if err := cRows.Scan(&b.Symbol, &b.Open, &b.High, &b.Low, &b.Close, &b.Volume, &b.Time); err == nil {
				timeGroupedBars[b.Time] = append(timeGroupedBars[b.Time], b)
			}
		}
		cRows.Close()

		// 3. Vectorized state accumulators across the 375 minutes
		type SymAcc struct {
			DayOpen    float64
			LastPrice  float64
			CumVol     int64
			CumTurn    float64
			Low        float64
			High       float64
			HasOpen    bool
		}
		accMap := map[string]*SymAcc{}

		allSnapshots := map[string]*ReplaySnapshotResponse{}

		for min := 555; min <= 930; min++ {
			timeStr := fmt.Sprintf("%02d:%02d:00", min/60, min%60)
			bars := timeGroupedBars[timeStr]

			for _, b := range bars {
				acc, ok := accMap[b.Symbol]
				if !ok {
					acc = &SymAcc{
						DayOpen:   b.Open,
						LastPrice: b.Close,
						CumVol:    b.Volume,
						CumTurn:   b.Close * float64(b.Volume),
						Low:       b.Low,
						High:      b.High,
						HasOpen:   true,
					}
					accMap[b.Symbol] = acc
				} else {
					acc.LastPrice = b.Close
					acc.CumVol += b.Volume
					acc.CumTurn += b.Close * float64(b.Volume)
					if b.Low < acc.Low {
						acc.Low = b.Low
					}
					if b.High > acc.High {
						acc.High = b.High
					}
				}
			}

			// Build ReplaySnapshot for this minute
			stocks := []ReplayStock{}
			aboveCount := 0
			sectorStats := map[string]*struct {
				Count      int
				SumMove    float64
				SumRVOL    float64
				AboveCount int
			}{}

			for sym, acc := range accMap {
				meta := stockMetaMap[sym]
				prevClose := meta.PrevClose
				if prevClose <= 0 {
					prevClose = acc.DayOpen
				}

				vwap := acc.LastPrice
				if acc.CumVol > 0 {
					vwap = acc.CumTurn / float64(acc.CumVol)
				}

				gapPct := 0.0
				if prevClose > 0 && acc.HasOpen {
					gapPct = math.Round(((acc.DayOpen-prevClose)/prevClose*100)*100) / 100
				}
				movePct := 0.0
				if prevClose > 0 {
					movePct = math.Round(((acc.LastPrice-prevClose)/prevClose*100)*100) / 100
				}
				vwapDistPct := 0.0
				if vwap > 0 {
					vwapDistPct = math.Round(((acc.LastPrice-vwap)/vwap*100)*100) / 100
				}
				rvol := 0.0
				if meta.AvgDailyVol > 0 {
					rvol = math.Round((float64(acc.CumVol)/meta.AvgDailyVol*100)*100) / 100
				}
				clv := 0.5
				if acc.High > acc.Low {
					clv = math.Round(((acc.LastPrice-acc.Low)/(acc.High-acc.Low))*100) / 100
				}

				isAbove := vwapDistPct >= 0
				if isAbove {
					aboveCount++
				}

				sec := GetSector(sym)
				if _, exists := sectorStats[sec]; !exists {
					sectorStats[sec] = &struct {
						Count      int
						SumMove    float64
						SumRVOL    float64
						AboveCount int
					}{}
				}
				st := sectorStats[sec]
				st.Count++
				st.SumMove += movePct
				st.SumRVOL += rvol
				if isAbove {
					st.AboveCount++
				}

				stocks = append(stocks, ReplayStock{
					Symbol:      sym,
					Sector:      sec,
					Price:       acc.LastPrice,
					GapPct:      gapPct,
					MovePct:     movePct,
					VWAP:        vwap,
					VWAPDistPct: vwapDistPct,
					RVOL:        rvol,
					CLV:         clv,
					Volume:      acc.CumVol,
					IsAboveVWAP: isAbove,
				})
			}

			total := len(stocks)
			pctAbove := 0.0
			if total > 0 {
				pctAbove = math.Round((float64(aboveCount)/float64(total)*100)*10) / 10
			}

			sectors := []ReplaySector{}
			for secName, st := range sectorStats {
				avgMove := math.Round((st.SumMove/float64(st.Count))*100) / 100
				avgRVOL := math.Round((st.SumRVOL/float64(st.Count))*100) / 100
				pctAboveSec := math.Round((float64(st.AboveCount)/float64(st.Count)*100)*10) / 10

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
			sort.Slice(stocks, func(i, j int) bool {
				return stocks[i].RVOL > stocks[j].RVOL
			})

			allSnapshots[timeStr] = &ReplaySnapshotResponse{
				SessionDate: sessionDate,
				AsOfTime:    timeStr,
				Weather: ReplayWeather{
					TotalCivs:    total,
					AboveVWAP:    aboveCount,
					BelowVWAP:    total - aboveCount,
					PctAboveVWAP: pctAbove,
				},
				Stocks:  stocks,
				Sectors: sectors,
				Traps:   []ReplayTrap{},
			}
		}

		// 4. Write all 375 snapshots into Redis in a single pipeline
		_ = r.redis.SetDaySnapshots(bgCtx, sessionDate, allSnapshots)
	}()

	return nil
}

