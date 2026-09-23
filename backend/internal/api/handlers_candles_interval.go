package api

import (
	"context"
	"fmt"
	"net/http"
)

func (s *Server) queryMultiIntervalCandles(w http.ResponseWriter, ctx context.Context, symbol, date, interval string) {
	bucket := "5 minutes"
	switch interval {
	case "3m":
		bucket = "3 minutes"
	case "15m":
		bucket = "15 minutes"
	case "30m":
		bucket = "30 minutes"
	case "1h", "60m":
		bucket = "1 hour"
	case "1d", "D":
		bucket = "1 day"
	}

	sql := `
		SELECT 
			EXTRACT(EPOCH FROM time_bucket($1::interval, c.ts))::int as time,
			(array_agg(c.open ORDER BY c.ts ASC))[1] as open,
			MAX(c.high) as high,
			MIN(c.low) as low,
			(array_agg(c.close ORDER BY c.ts DESC))[1] as close,
			SUM(c.volume) as volume,
			(array_agg(COALESCE(f.session_vwap, c.close) ORDER BY c.ts DESC))[1] as vwap,
			(array_agg(f.vwap_upper_1 ORDER BY c.ts DESC))[1] as vwap_upper_1,
			(array_agg(f.vwap_lower_1 ORDER BY c.ts DESC))[1] as vwap_lower_1,
			(array_agg(f.vwap_upper_2 ORDER BY c.ts DESC))[1] as vwap_upper_2,
			(array_agg(f.vwap_lower_2 ORDER BY c.ts DESC))[1] as vwap_lower_2,
			(array_agg(COALESCE(f.relative_volume, 1.0) ORDER BY c.ts DESC))[1] as rvol,
			MAX(df.prior_high) as pdh,
			MIN(df.prior_low) as pdl
		FROM market.cash_candles_1m c
		JOIN market.instruments i ON c.instrument_id = i.id
		LEFT JOIN market.intraday_features_1m f ON f.instrument_id = i.id AND f.ts = c.ts
		LEFT JOIN market.feature_runs fr ON fr.session_date = (c.ts AT TIME ZONE 'Asia/Kolkata')::date AND fr.feature_set = 'DAILY' AND fr.status = 'SUCCEEDED'
		LEFT JOIN market.daily_features df ON df.instrument_id = i.id AND df.feature_run_id = fr.id
		WHERE i.symbol = $2 
		  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::date = $3::date
		  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time >= '09:15:00'::time
		  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time < '15:30:00'::time
		GROUP BY 1
		ORDER BY 1 ASC;
	`
	rows, err := s.db.Pool.Query(ctx, sql, bucket, symbol, date)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("query multi-interval candles: %v", err))
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
