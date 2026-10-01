package api

import (
	"fmt"
	"net/http"
)

type Stock struct {
	Symbol      string  `json:"symbol"`
	Sector      string  `json:"sector"`
	Price       float64 `json:"price"`
	MovePct     float64 `json:"move_pct"`
	GapPct      float64 `json:"gap_pct"`
	Vwap        float64 `json:"vwap"`
	VwapDistPct float64 `json:"vwap_dist_pct"`
	Rvol        float64 `json:"rvol"`
	Clv         float64 `json:"clv"`
	Volume      float64 `json:"volume"`
	IsAboveVwap bool    `json:"is_above_vwap"`
	Pdh         float64 `json:"pdh"`
	Pdl         float64 `json:"pdl"`
	OiLatest    int64   `json:"oi_latest"`
	OiChangePct float64 `json:"oi_change_pct"`
	VwapSigma   float64 `json:"vwap_sigma"`
}

type SectorSummary struct {
	Sector       string  `json:"sector"`
	CivCount     int     `json:"civ_count"`
	AvgMovePct   float64 `json:"avg_move_pct"`
	AvgRvol      float64 `json:"avg_rvol"`
	PctAboveVwap float64 `json:"pct_above_vwap"`
}

// Market Snapshot: GET /api/market/snapshot?date=YYYY-MM-DD&asOf=15:30:00
func (s *Server) HandleMarketSnapshot(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	sessionDate := r.URL.Query().Get("date")
	if sessionDate == "" {
		var latest string
		if err := s.db.Pool.QueryRow(ctx, "SELECT DISTINCT session_date FROM market.feature_runs ORDER BY session_date DESC LIMIT 1").Scan(&latest); err == nil && latest != "" {
			sessionDate = latest
		} else {
			sessionDate = "2026-08-25"
		}
	}

	asOf := r.URL.Query().Get("asOf")
	if asOf == "" {
		asOf = "15:30:00"
	}

	sql := `
		WITH prior_fut AS (
			SELECT fc.instrument_id,
				MAX(sub.open_interest) FILTER (WHERE sub.rn = 1) as oi_latest,
				ROUND(((MAX(sub.open_interest) FILTER (WHERE sub.rn = 1) - MAX(sub.open_interest) FILTER (WHERE sub.rn = 2))::numeric / NULLIF(MAX(sub.open_interest) FILTER (WHERE sub.rn = 2), 0) * 100), 2) as oi_1d_pct
			FROM (
				SELECT c.future_contract_id, c.open_interest,
					ROW_NUMBER() OVER (PARTITION BY c.future_contract_id ORDER BY c.session_date DESC) as rn
				FROM market.future_candles_1d c
				WHERE c.session_date < $1::date
			) sub
			JOIN market.future_contracts fc ON fc.id = sub.future_contract_id AND fc.is_active
			WHERE sub.rn <= 2
			GROUP BY fc.instrument_id
		),
		latest_min AS (
			SELECT DISTINCT ON (c.instrument_id)
				i.symbol, COALESCE(i.sector, 'OTHERS') as sector, c.close as price,
				ROUND(((c.close - df.prior_close) / NULLIF(df.prior_close, 0) * 100)::numeric, 2) as move_pct,
				ROUND(((c.open - df.prior_close) / NULLIF(df.prior_close, 0) * 100)::numeric, 2) as gap_pct,
				ROUND(COALESCE(f.session_vwap, c.close)::numeric, 2) as vwap,
				ROUND(((c.close - COALESCE(f.session_vwap, c.close)) / NULLIF(COALESCE(f.session_vwap, c.close), 0) * 100)::numeric, 2) as vwap_dist_pct,
				ROUND(COALESCE(f.relative_volume, 1.0)::numeric, 2) as rvol,
				ROUND(COALESCE(f.clv, 0)::numeric, 2) as clv,
				c.volume as volume,
				(c.close >= COALESCE(f.session_vwap, c.close)) as is_above_vwap,
				COALESCE(df.prior_high, 0) as pdh,
				COALESCE(df.prior_low, 0) as pdl,
				COALESCE(pf.oi_latest, df.futures_oi_latest, 0) as oi_latest,
				COALESCE(pf.oi_1d_pct, 0) as oi_change_pct,
				ROUND(COALESCE(f.vwap_distance_sigma, 0)::numeric, 2) as vwap_sigma
			FROM market.cash_candles_1m c
			JOIN market.instruments i ON c.instrument_id = i.id
			LEFT JOIN market.intraday_features_1m f ON f.instrument_id = i.id AND f.ts = c.ts
			LEFT JOIN market.feature_runs fr ON fr.session_date = $1::date AND fr.feature_set = 'DAILY' AND fr.status = 'SUCCEEDED'
			LEFT JOIN market.daily_features df ON df.instrument_id = i.id AND df.feature_run_id = fr.id
			LEFT JOIN prior_fut pf ON pf.instrument_id = i.id
			WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = $1::date
			  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time <= $2::time
			ORDER BY c.instrument_id, c.ts DESC
		)
		SELECT symbol, sector, price, move_pct, gap_pct, vwap, vwap_dist_pct, rvol, clv, volume, is_above_vwap, pdh, pdl, oi_latest, oi_change_pct, vwap_sigma
		FROM latest_min ORDER BY rvol DESC;
	`
	rows, err := s.db.Pool.Query(ctx, sql, sessionDate, asOf)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("query snapshot: %v", err))
		return
	}
	defer rows.Close()

	stocks, aboveVwap, sectorStats := s.scanSnapshotStocks(rows)
	total := len(stocks)
	pctAbove := 0.0
	if total > 0 {
		pctAbove = float64(aboveVwap) / float64(total) * 100
	}

	sectorsList := make([]*SectorSummary, 0, len(sectorStats))
	for secName, st := range sectorStats {
		if st.count > 0 {
			sectorsList = append(sectorsList, &SectorSummary{
				Sector:       secName,
				CivCount:     st.count,
				AvgMovePct:   st.sumMove / float64(st.count),
				AvgRvol:      st.sumRvol / float64(st.count),
				PctAboveVwap: float64(st.aboveCount) / float64(st.count) * 100,
			})
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"session_date": sessionDate,
		"as_of_time":   asOf,
		"weather": map[string]interface{}{
			"total_civs":     total,
			"above_vwap":     aboveVwap,
			"below_vwap":     total - aboveVwap,
			"pct_above_vwap": pctAbove,
		},
		"stocks":  stocks,
		"sectors": sectorsList,
		"traps":   []interface{}{},
	})
}
