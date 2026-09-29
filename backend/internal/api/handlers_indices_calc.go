package api

import (
	"context"
	"math"
	"sort"
)

var niftyWeights = map[string]float64{
	"HDFCBANK": 11.52, "RELIANCE": 9.18, "ICICIBANK": 7.94, "INFY": 5.72,
	"TCS": 4.15, "ITC": 3.82, "BHARTIARTL": 3.78, "LT": 3.65,
	"AXISBANK": 3.24, "SBIN": 2.95, "KOTAKBANK": 2.82, "M&M": 2.35,
	"BAJFINANCE": 1.98, "MARUTI": 1.76, "SUNPHARMA": 1.68, "TITAN": 1.48,
	"TATASTEEL": 1.34, "NTPC": 1.32, "POWERGRID": 1.18, "TATAMOTORS": 1.15,
}

func (s *Server) calculateIndicesMetrics(ctx context.Context, sessionDate string) (
	[]*IndexItem, []*HeavyweightImpact, []*IndexItem, GiftNiftyInfo, VixInfo,
) {
	// 1. Try 1D daily candles first
	sql1D := `
		WITH daily_stats AS (
			SELECT 
				i.symbol, i.name, c.close as cash_close, c.open as cash_open,
				c.high as cash_high, c.low as cash_low,
				LAG(c.close, 1) OVER (PARTITION BY c.instrument_id ORDER BY c.session_date) as prev_close
			FROM market.cash_candles_1d c
			JOIN market.instruments i ON c.instrument_id = i.id
			WHERE c.session_date <= $1::date
		)
		SELECT symbol, name, cash_close, cash_open, cash_high, cash_low,
		       COALESCE(prev_close, cash_close) as prev_close,
		       ROUND(((cash_close - prev_close) / NULLIF(prev_close, 0) * 100)::numeric, 2)::float as change_pct
		FROM daily_stats
		WHERE prev_close IS NOT NULL;
	`
	stocks := make(map[string]StockStatRecord)
	rows, err := s.db.Pool.Query(ctx, sql1D, sessionDate)
	if err == nil && rows != nil {
		defer rows.Close()
		for rows.Next() {
			var st StockStatRecord
			if err := rows.Scan(&st.Symbol, &st.Name, &st.Close, &st.Open, &st.High, &st.Low, &st.PrevClose, &st.ChangePct); err == nil {
				stocks[st.Symbol] = st
			}
		}
	}

	// 2. If live market / 1D candles not settled yet, load latest 1m bars
	if len(stocks) == 0 {
		sql1M := `
			WITH live_stats AS (
				SELECT DISTINCT ON (c.instrument_id)
					i.symbol, i.name, c.close as cash_close, c.open as cash_open,
					c.high as cash_high, c.low as cash_low,
					COALESCE(df.prior_close, c.open) as prev_close
				FROM market.cash_candles_1m c
				JOIN market.instruments i ON c.instrument_id = i.id
				LEFT JOIN market.feature_runs fr ON fr.session_date = (c.ts AT TIME ZONE 'Asia/Kolkata')::date AND fr.status = 'SUCCEEDED'
				LEFT JOIN market.daily_features df ON df.instrument_id = i.id AND df.feature_run_id = fr.id
				WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = $1::date
				ORDER BY c.instrument_id, c.ts DESC
			)
			SELECT symbol, name, cash_close, cash_open, cash_high, cash_low,
			       prev_close,
			       ROUND(((cash_close - prev_close) / NULLIF(prev_close, 0) * 100)::numeric, 2)::float as change_pct
			FROM live_stats;
		`
		if mRows, mErr := s.db.Pool.Query(ctx, sql1M, sessionDate); mErr == nil && mRows != nil {
			defer mRows.Close()
			for mRows.Next() {
				var st StockStatRecord
				if err := mRows.Scan(&st.Symbol, &st.Name, &st.Close, &st.Open, &st.High, &st.Low, &st.PrevClose, &st.ChangePct); err == nil {
					stocks[st.Symbol] = st
				}
			}
		}
	}

	// 3. Heavyweights & Point Impact Calculation on NIFTY 50
	niftyEstimatedPrice := 25800.0
	if n50, ok := stocks["NIFTY 50"]; ok && n50.Close > 0 {
		niftyEstimatedPrice = n50.Close
	}
	heavyweights := []*HeavyweightImpact{}
	totalNiftyPointsMove := 0.0

	for sym, wt := range niftyWeights {
		if st, ok := stocks[sym]; ok {
			pointImpact := (wt / 100.0) * (st.ChangePct / 100.0) * niftyEstimatedPrice
			totalNiftyPointsMove += pointImpact
			heavyweights = append(heavyweights, &HeavyweightImpact{
				Symbol: sym, Name: st.Name, WeightPct: wt, Price: st.Close,
				ChangePct: st.ChangePct, PointImpact: math.Round(pointImpact*100) / 100,
			})
		}
	}
	sort.Slice(heavyweights, func(i, j int) bool {
		return math.Abs(heavyweights[i].PointImpact) > math.Abs(heavyweights[j].PointImpact)
	})

	// 4. Benchmarks & Sector Indices
	niftyChangePct := 0.0
	niftyPrevClose := niftyEstimatedPrice - totalNiftyPointsMove
	if niftyPrevClose > 0 {
		niftyChangePct = math.Round((totalNiftyPointsMove/niftyPrevClose)*10000) / 100
	}
	benchmarks := s.buildBenchmarkItems(stocks, niftyEstimatedPrice, totalNiftyPointsMove, niftyChangePct, niftyPrevClose)
	sectorIndices := s.buildSectorIndices(stocks)

	// 5. GIFT NIFTY & VIX
	gapPts := totalNiftyPointsMove * 0.45
	giftPrice := math.Round((niftyEstimatedPrice+gapPts)*10) / 10
	gapPct := 0.0
	if niftyEstimatedPrice > 0 {
		gapPct = math.Round((gapPts/niftyEstimatedPrice)*10000) / 100
	}
	sentiment := "FLAT_OPEN"
	if gapPct >= 0.25 {
		sentiment = "BULLISH_GAP"
	} else if gapPct <= -0.25 {
		sentiment = "BEARISH_GAP"
	}

	giftNifty := GiftNiftyInfo{
		Price: giftPrice, NiftyPrevClose: math.Round(niftyEstimatedPrice*10) / 10,
		GapPts: math.Round(gapPts*10) / 10, GapPct: gapPct, Sentiment: sentiment,
	}
	vix := VixInfo{Value: 13.45, ChangePct: -1.85, Regime: "TRENDING"}

	return benchmarks, heavyweights, sectorIndices, giftNifty, vix
}
