package readapi

import (
	"context"
	"fmt"
)

func (r *Repository) ReplayCandles(ctx context.Context, sessionDate, symbol, toTime, interval string) ([]ReplayCandle, error) {
	if interval == "1d" {
		return r.replayDailyCandles(ctx, sessionDate, symbol)
	}
	if interval == "1h" {
		return r.replayHourlyCandles(ctx, sessionDate, symbol, toTime)
	}
	return r.replayMinuteCandles(ctx, sessionDate, symbol, toTime)
}

func (r *Repository) replayDailyCandles(ctx context.Context, sessionDate, symbol string) ([]ReplayCandle, error) {
	query := `
	SELECT 
		EXTRACT(EPOCH FROM (c.session_date::timestamp AT TIME ZONE 'Asia/Kolkata'))::bigint as time_sec,
		c.open, c.high, c.low, c.close, c.volume, c.close as vwap
	FROM market.cash_candles_1d c
	JOIN market.instruments i ON c.instrument_id = i.id
	WHERE c.session_date <= $1::date
	  AND i.symbol = $2
	ORDER BY c.session_date ASC;
	`
	rows, err := r.db.Pool.Query(ctx, query, sessionDate, symbol)
	if err != nil {
		return nil, fmt.Errorf("query daily replay candles: %w", err)
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

func (r *Repository) replayHourlyCandles(ctx context.Context, sessionDate, symbol, toTime string) ([]ReplayCandle, error) {
	query := `
	WITH recent_sessions AS (
		SELECT DISTINCT (ts AT TIME ZONE 'Asia/Kolkata')::date as dt
		FROM market.cash_candles_1m
		WHERE (ts AT TIME ZONE 'Asia/Kolkata')::date <= $1::date
		ORDER BY dt DESC LIMIT 10
	),
	minute_bars AS (
		SELECT 
			c.ts, c.open, c.high, c.low, c.close, c.volume,
			(c.ts AT TIME ZONE 'Asia/Kolkata')::date as bar_date,
			date_trunc('hour', c.ts AT TIME ZONE 'Asia/Kolkata') as hour_bucket
		FROM market.cash_candles_1m c
		JOIN market.instruments i ON c.instrument_id = i.id
		JOIN recent_sessions rs ON (c.ts AT TIME ZONE 'Asia/Kolkata')::date = rs.dt
		WHERE i.symbol = $2
		  AND ((c.ts AT TIME ZONE 'Asia/Kolkata')::date < $1::date OR (c.ts AT TIME ZONE 'Asia/Kolkata')::time <= $3::time)
	),
	hourly_aggregated AS (
		SELECT 
			EXTRACT(EPOCH FROM (hour_bucket AT TIME ZONE 'Asia/Kolkata'))::bigint as time_sec,
			(ARRAY_AGG(open ORDER BY ts ASC))[1] as open,
			MAX(high) as high,
			MIN(low) as low,
			(ARRAY_AGG(close ORDER BY ts DESC))[1] as close,
			SUM(volume) as volume,
			SUM(close * volume) / NULLIF(SUM(volume), 0) as vwap
		FROM minute_bars
		GROUP BY hour_bucket
		ORDER BY hour_bucket ASC
	)
	SELECT time_sec, open, high, low, close, volume, COALESCE(vwap, close)
	FROM hourly_aggregated;
	`
	rows, err := r.db.Pool.Query(ctx, query, sessionDate, symbol, toTime)
	if err != nil {
		return nil, fmt.Errorf("query hourly replay candles: %w", err)
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

func (r *Repository) replayMinuteCandles(ctx context.Context, sessionDate, symbol, toTime string) ([]ReplayCandle, error) {
	query := `
	WITH session_bars AS (
		SELECT 
			c.ts, c.open, c.high, c.low, c.close, c.volume,
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
