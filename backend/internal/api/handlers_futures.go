package api

import (
	"fmt"
	"net/http"
	"strconv"
)

type FuturesInflowItem struct {
	Symbol           string   `json:"symbol"`
	TradingSymbol    string   `json:"trading_symbol"`
	Expiry           *string  `json:"expiry,omitempty"`
	LotSize          *int     `json:"lot_size,omitempty"`
	SessionDate      string   `json:"session_date"`
	FutClose         float64  `json:"fut_close"`
	PrevClose        float64  `json:"prev_close"`
	FutOi            int64    `json:"fut_oi"`
	PrevOi           int64    `json:"prev_oi"`
	TotalNotionalCr  float64  `json:"total_notional_cr"`
	Price1dPct       float64  `json:"price_1d_pct"`
	Oi1dPct          float64  `json:"oi_1d_pct"`
	FreshInflow1dCr  float64  `json:"fresh_inflow_1d_cr"`
	Oi3dPct          float64  `json:"oi_3d_pct"`
	FreshInflow3dCr  float64  `json:"fresh_inflow_3d_cr"`
}

type FuturesInflowResponse struct {
	SessionDate    string               `json:"session_date"`
	AvailableDates []string             `json:"available_dates"`
	TotalCount     int                  `json:"total_count"`
	Data           []*FuturesInflowItem `json:"data"`
}

// GET /api/market/macro/futures-inflow
func (s *Server) HandleFuturesInflow(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	targetDate := r.URL.Query().Get("date")

	// 1. Fetch available session dates
	datesRows, err := s.db.Pool.Query(ctx, `
		SELECT DISTINCT session_date::text 
		FROM market.feature_runs 
		WHERE status = 'SUCCEEDED'
		ORDER BY session_date DESC LIMIT 30;
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("dates query: %v", err))
		return
	}
	defer datesRows.Close()

	availableDates := []string{}
	for datesRows.Next() {
		var d string
		if err := datesRows.Scan(&d); err == nil {
			availableDates = append(availableDates, d)
		}
	}

	sessionDate := ""
	if targetDate != "" {
		sessionDate = targetDate
	} else if len(availableDates) > 0 {
		sessionDate = availableDates[0]
	}

	if sessionDate == "" {
		writeJSON(w, http.StatusOK, &FuturesInflowResponse{
			SessionDate:    "",
			AvailableDates: []string{},
			TotalCount:     0,
			Data:           []*FuturesInflowItem{},
		})
		return
	}

	// 2. Parse optional filters
	var minPrice, maxPrice, minInflow, minOiPct *float64
	if v := r.URL.Query().Get("minPrice"); v != "" {
		if val, err := strconv.ParseFloat(v, 64); err == nil {
			minPrice = &val
		}
	}
	if v := r.URL.Query().Get("maxPrice"); v != "" {
		if val, err := strconv.ParseFloat(v, 64); err == nil && val > 0 {
			maxPrice = &val
		}
	}
	if v := r.URL.Query().Get("minInflow"); v != "" {
		if val, err := strconv.ParseFloat(v, 64); err == nil {
			minInflow = &val
		}
	}
	if v := r.URL.Query().Get("minOiPct"); v != "" {
		if val, err := strconv.ParseFloat(v, 64); err == nil {
			minOiPct = &val
		}
	}

	// 3. Query Futures Dynamics & Inflow
	sql := `
		WITH daily_stats AS (
			SELECT 
				c.instrument_id,
				c.session_date,
				c.close as cash_close,
				LAG(c.close, 1) OVER (PARTITION BY c.instrument_id ORDER BY c.session_date) as prev_close
			FROM market.cash_candles_1d c
			WHERE c.session_date <= $1::date
		),
		current_session AS (
			SELECT * FROM daily_stats WHERE session_date = $2::date
		)
		SELECT 
			i.symbol,
			COALESCE(fc.trading_symbol, i.symbol || 'FUT') as trading_symbol,
			fc.expiry::text as expiry,
			fc.lot_size,
			cs.session_date::text,
			cs.cash_close::float as fut_close,
			COALESCE(cs.prev_close::float, cs.cash_close::float) as prev_close,
			COALESCE(df.futures_oi_latest, 0) as fut_oi,
			COALESCE(df.futures_oi_5d_ago, 0) as prev_oi,
			ROUND((cs.cash_close * COALESCE(df.futures_oi_latest, 0) / 10000000.0)::numeric, 2)::float as total_notional_cr,
			ROUND(((cs.cash_close - cs.prev_close) / NULLIF(cs.prev_close, 0) * 100)::numeric, 2)::float as price_1d_pct,
			ROUND(COALESCE(df.futures_oi_change_5d_pct, 0)::numeric, 2)::float as oi_1d_pct,
			ROUND(((COALESCE(df.futures_oi_latest, 0) - COALESCE(df.futures_oi_5d_ago, 0)) * cs.cash_close / 10000000.0)::numeric, 2)::float as fresh_inflow_1d_cr,
			ROUND(COALESCE(df.futures_oi_change_5d_pct, 0)::numeric, 2)::float as oi_3d_pct,
			ROUND(((COALESCE(df.futures_oi_latest, 0) - COALESCE(df.futures_oi_5d_ago, 0)) * cs.cash_close / 10000000.0)::numeric, 2)::float as fresh_inflow_3d_cr
		FROM current_session cs
		JOIN market.instruments i ON cs.instrument_id = i.id
		LEFT JOIN market.future_contracts fc ON fc.instrument_id = i.id AND fc.is_active = true
		LEFT JOIN market.feature_runs fr ON fr.session_date = cs.session_date AND fr.status = 'SUCCEEDED'
		LEFT JOIN market.daily_features df ON df.feature_run_id = fr.id AND df.instrument_id = i.id
		WHERE ($3::float IS NULL OR cs.cash_close >= $3)
		  AND ($4::float IS NULL OR cs.cash_close <= $4)
		  AND ($5::float IS NULL OR ABS(ROUND(((COALESCE(df.futures_oi_latest, 0) - COALESCE(df.futures_oi_5d_ago, 0)) * cs.cash_close / 10000000.0)::numeric, 2)) >= $5)
		  AND ($6::float IS NULL OR ABS(COALESCE(df.futures_oi_change_5d_pct, 0)) >= $6)
		ORDER BY fresh_inflow_1d_cr DESC NULLS LAST;
	`

	rows, err := s.db.Pool.Query(ctx, sql, sessionDate, sessionDate, minPrice, maxPrice, minInflow, minOiPct)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("futures inflow query: %v", err))
		return
	}
	defer rows.Close()

	items := []*FuturesInflowItem{}
	for rows.Next() {
		var item FuturesInflowItem
		if err := rows.Scan(
			&item.Symbol,
			&item.TradingSymbol,
			&item.Expiry,
			&item.LotSize,
			&item.SessionDate,
			&item.FutClose,
			&item.PrevClose,
			&item.FutOi,
			&item.PrevOi,
			&item.TotalNotionalCr,
			&item.Price1dPct,
			&item.Oi1dPct,
			&item.FreshInflow1dCr,
			&item.Oi3dPct,
			&item.FreshInflow3dCr,
		); err != nil {
			writeError(w, http.StatusInternalServerError, fmt.Sprintf("scan error: %v", err))
			return
		}
		items = append(items, &item)
	}

	writeJSON(w, http.StatusOK, &FuturesInflowResponse{
		SessionDate:    sessionDate,
		AvailableDates: availableDates,
		TotalCount:     len(items),
		Data:           items,
	})
}
