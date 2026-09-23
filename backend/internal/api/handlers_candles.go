package api

import (
	"context"
	"fmt"
	"net/http"
)

// Candle defines the typed JSON contract for frontend charting.
type Candle struct {
	Time       int64    `json:"time"`
	Open       float64  `json:"open"`
	High       float64  `json:"high"`
	Low        float64  `json:"low"`
	Close      float64  `json:"close"`
	Volume     float64  `json:"volume"`
	Vwap       float64  `json:"vwap"`
	VwapUpper1 *float64 `json:"vwap_upper_1"`
	VwapLower1 *float64 `json:"vwap_lower_1"`
	VwapUpper2 *float64 `json:"vwap_upper_2"`
	VwapLower2 *float64 `json:"vwap_lower_2"`
	Rvol       *float64 `json:"rvol"`
	Pdh        *float64 `json:"pdh"`
	Pdl        *float64 `json:"pdl"`
}

// Candles: GET /api/market/candles?symbol=XYZ&date=YYYY-MM-DD&interval=1m&toTime=15:30:00
func (s *Server) HandleCandles(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	symbol := r.URL.Query().Get("symbol")
	date := r.URL.Query().Get("date")
	interval := r.URL.Query().Get("interval")
	toTime := r.URL.Query().Get("toTime")

	if symbol == "" || date == "" {
		writeError(w, http.StatusBadRequest, "symbol and date query parameters are required")
		return
	}
	if interval == "" {
		interval = "1m"
	}
	if toTime == "" {
		toTime = "15:30:00"
	}

	if interval == "1m" {
		s.query1mCandles(w, ctx, symbol, date, toTime)
		return
	}
	s.queryMultiIntervalCandles(w, ctx, symbol, date, interval)
}

func (s *Server) query1mCandles(w http.ResponseWriter, ctx context.Context, symbol, date, toTime string) {
	sql := `
		SELECT 
			EXTRACT(EPOCH FROM c.ts)::int as time,
			c.open, c.high, c.low, c.close, c.volume,
			COALESCE(f.session_vwap, c.close) as vwap,
			f.vwap_upper_1, f.vwap_lower_1, f.vwap_upper_2, f.vwap_lower_2,
			COALESCE(f.relative_volume, 1.0) as rvol,
			df.prior_high as pdh, df.prior_low as pdl
		FROM market.cash_candles_1m c
		JOIN market.instruments i ON c.instrument_id = i.id
		LEFT JOIN market.intraday_features_1m f ON f.instrument_id = i.id AND f.ts = c.ts
		LEFT JOIN market.feature_runs fr ON fr.session_date = (c.ts AT TIME ZONE 'Asia/Kolkata')::date AND fr.feature_set = 'DAILY' AND fr.status = 'SUCCEEDED'
		LEFT JOIN market.daily_features df ON df.instrument_id = i.id AND df.feature_run_id = fr.id
		WHERE i.symbol = $1 
		  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::date = $2::date 
		  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time >= '09:15:00'::time
		  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time <= $3::time
		ORDER BY c.ts ASC;
	`
	rows, err := s.db.Pool.Query(ctx, sql, symbol, date, toTime)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("query candles: %v", err))
		return
	}
	defer rows.Close()

	candles := []*Candle{}
	for rows.Next() {
		var c Candle
		var vol int64
		if err := rows.Scan(&c.Time, &c.Open, &c.High, &c.Low, &c.Close, &vol, &c.Vwap, &c.VwapUpper1, &c.VwapLower1, &c.VwapUpper2, &c.VwapLower2, &c.Rvol, &c.Pdh, &c.Pdl); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		c.Volume = float64(vol)
		candles = append(candles, &c)
	}
	writeJSON(w, http.StatusOK, candles)
}
