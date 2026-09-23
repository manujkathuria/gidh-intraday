package store

import (
	"context"
	"fmt"
)

func (r *DailyFeatureRepo) LoadExpectedVolumeProfile(ctx context.Context, sessionDate string) (map[int64]map[int16]int64, error) {
	query := `
		WITH daily_cum AS (
			SELECT instrument_id, (ts AT TIME ZONE 'Asia/Kolkata')::date as dt,
				ROW_NUMBER() OVER (PARTITION BY instrument_id, (ts AT TIME ZONE 'Asia/Kolkata')::date ORDER BY ts) - 1 as minute_idx,
				SUM(volume) OVER (PARTITION BY instrument_id, (ts AT TIME ZONE 'Asia/Kolkata')::date ORDER BY ts) as cum_vol
			FROM market.cash_candles_1m
			WHERE ts >= (($1::date - 40)::timestamp AT TIME ZONE 'Asia/Kolkata')
			  AND ts < ($1::date::timestamp AT TIME ZONE 'Asia/Kolkata')
		),
		distinct_dates AS (
			SELECT DISTINCT dt FROM daily_cum ORDER BY dt DESC LIMIT 20
		),
		filtered AS (
			SELECT c.instrument_id, c.minute_idx, c.cum_vol
			FROM daily_cum c
			JOIN distinct_dates d ON c.dt = d.dt
		)
		SELECT instrument_id, minute_idx::smallint, AVG(cum_vol)::bigint as avg_cum_vol
		FROM filtered
		GROUP BY instrument_id, minute_idx;
	`
	rows, err := r.db.Pool.Query(ctx, query, sessionDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	profile := make(map[int64]map[int16]int64)
	for rows.Next() {
		var instID int64
		var minIdx int16
		var avgVol int64
		if err := rows.Scan(&instID, &minIdx, &avgVol); err != nil {
			return nil, err
		}
		if profile[instID] == nil {
			profile[instID] = make(map[int16]int64)
		}
		profile[instID][minIdx] = avgVol
	}
	return profile, rows.Err()
}

func (r *DailyFeatureRepo) LoadTodayBaselines(ctx context.Context, sessionDate string) (string, map[int64]DailyFeatureBaseline, error) {
	var runID string
	err := r.db.Pool.QueryRow(ctx, `
		SELECT r.id::text
		FROM market.feature_runs r
		JOIN market.data_readiness d ON d.feature_run_id = r.id AND d.status = 'READY'
		WHERE r.feature_set = 'DAILY' AND r.session_date = $1::date AND r.status = 'SUCCEEDED'
		LIMIT 1;
	`, sessionDate).Scan(&runID)
	if err != nil {
		return "", nil, fmt.Errorf("no succeeded daily feature run for %s: %w", sessionDate, err)
	}

	rows, err := r.db.Pool.Query(ctx, `
		SELECT f.instrument_id, i.symbol, f.prior_close, f.atr_14, f.adr_20
		FROM market.daily_features f
		JOIN market.instruments i ON f.instrument_id = i.id
		WHERE f.feature_run_id = $1::uuid;
	`, runID)
	if err != nil {
		return "", nil, err
	}
	defer rows.Close()

	baselines := make(map[int64]DailyFeatureBaseline)
	for rows.Next() {
		var b DailyFeatureBaseline
		if err := rows.Scan(&b.InstrumentID, &b.Symbol, &b.PriorClose, &b.ATR14, &b.ADR20); err != nil {
			return "", nil, err
		}
		baselines[b.InstrumentID] = b
	}
	return runID, baselines, rows.Err()
}

func (r *DailyFeatureRepo) LoadTodayCandles(ctx context.Context, sessionDate string) (map[int64][]MarketCandle, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT instrument_id, ts, open, high, low, close, volume
		FROM market.cash_candles_1m
		WHERE (ts AT TIME ZONE 'Asia/Kolkata')::date = $1::date
		  AND (ts AT TIME ZONE 'Asia/Kolkata')::time >= '09:15:00'::time
		  AND (ts AT TIME ZONE 'Asia/Kolkata')::time < '15:30:00'::time
		ORDER BY instrument_id, ts ASC;
	`, sessionDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	candles := make(map[int64][]MarketCandle)
	for rows.Next() {
		var instID int64
		var c MarketCandle
		if err := rows.Scan(&instID, &c.Timestamp, &c.Open, &c.High, &c.Low, &c.Close, &c.Volume); err != nil {
			return nil, err
		}
		candles[instID] = append(candles[instID], c)
	}
	return candles, rows.Err()
}
