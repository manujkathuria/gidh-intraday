package store

import "context"

func (r *DailyFeatureRepo) Build(ctx context.Context, run *DailyFeatureRun) error {
	tag, err := r.db.Pool.Exec(ctx, `
		WITH history AS (
			SELECT c.instrument_id, c.session_date, c.open, c.high, c.low, c.close, c.volume,
				LAG(c.close) OVER (PARTITION BY c.instrument_id ORDER BY c.session_date) AS previous_close
			FROM market.cash_candles_1d c
			JOIN market.instruments i ON i.id = c.instrument_id AND i.is_active
			WHERE c.session_date < $2::date
		), ranked AS (
			SELECT *, ROW_NUMBER() OVER (PARTITION BY instrument_id ORDER BY session_date DESC) AS rn,
				COUNT(*) OVER (PARTITION BY instrument_id) AS sessions
			FROM history
		), cash_metrics AS (
			SELECT instrument_id, MAX(sessions) AS sessions,
				MAX(close) FILTER (WHERE rn = 1) AS prior_close,
				MAX(high) FILTER (WHERE rn = 1) AS prior_high,
				MIN(low) FILTER (WHERE rn = 1) AS prior_low,
				MAX(high) FILTER (WHERE rn <= 5) AS prior_week_high,
				MIN(low) FILTER (WHERE rn <= 5) AS prior_week_low,
				AVG(GREATEST(high - low, ABS(high - previous_close), ABS(low - previous_close))) FILTER (WHERE rn <= 14) AS atr_14,
				AVG(high - low) FILTER (WHERE rn <= 20) AS adr_20,
				AVG(close) FILTER (WHERE rn <= 20) AS sma_20,
				AVG(close) FILTER (WHERE rn <= 50) AS sma_50,
				MAX(close) FILTER (WHERE rn = 6) AS close_5d_ago,
				MAX(close) FILTER (WHERE rn = 21) AS close_20d_ago,
				MAX(high) FILTER (WHERE rn <= 20) AS high_20d,
				MIN(low) FILTER (WHERE rn <= 20) AS low_20d,
				AVG(volume) FILTER (WHERE rn <= 20) AS average_volume_20,
				AVG(volume) FILTER (WHERE rn <= 3) AS average_volume_3
			FROM ranked GROUP BY instrument_id HAVING MAX(sessions) >= 50
		), future_ranked AS (
			SELECT f.instrument_id, c.open_interest,
				ROW_NUMBER() OVER (PARTITION BY f.instrument_id ORDER BY c.session_date DESC) AS rn
			FROM market.future_candles_1d c
			JOIN market.future_contracts f ON f.id = c.future_contract_id AND f.is_active
			WHERE c.session_date < $2::date
		), future_metrics AS (
			SELECT instrument_id, MAX(open_interest) FILTER (WHERE rn = 1) AS oi_latest,
				MAX(open_interest) FILTER (WHERE rn = 6) AS oi_5d_ago
			FROM future_ranked GROUP BY instrument_id
		)
		INSERT INTO market.daily_features (
			feature_run_id, instrument_id, source_daily_sessions, prior_close, prior_high, prior_low,
			prior_week_high, prior_week_low, cpr_pivot, cpr_bc, cpr_tc, atr_14, adr_20,
			sma_20, sma_50, return_5d_pct, return_20d_pct, distance_20d_high_pct,
			distance_20d_low_pct, average_daily_volume_20, volume_dryup_ratio,
			futures_oi_latest, futures_oi_5d_ago, futures_oi_change_5d_pct
		)
		SELECT $1::uuid, m.instrument_id, m.sessions, m.prior_close, m.prior_high, m.prior_low,
			m.prior_week_high, m.prior_week_low,
			(m.prior_high + m.prior_low + m.prior_close) / 3,
			(m.prior_high + m.prior_low) / 2,
			2 * ((m.prior_high + m.prior_low + m.prior_close) / 3) - ((m.prior_high + m.prior_low) / 2),
			m.atr_14, m.adr_20, m.sma_20, m.sma_50,
			(m.prior_close - m.close_5d_ago) / NULLIF(m.close_5d_ago, 0) * 100,
			(m.prior_close - m.close_20d_ago) / NULLIF(m.close_20d_ago, 0) * 100,
			(m.high_20d - m.prior_close) / NULLIF(m.prior_close, 0) * 100,
			(m.prior_close - m.low_20d) / NULLIF(m.prior_close, 0) * 100,
			m.average_volume_20::bigint,
			m.average_volume_3 / NULLIF(m.average_volume_20, 0),
			f.oi_latest, f.oi_5d_ago,
			(f.oi_latest - f.oi_5d_ago)::numeric / NULLIF(f.oi_5d_ago, 0) * 100
		FROM cash_metrics m LEFT JOIN future_metrics f ON f.instrument_id = m.instrument_id;
	`, run.ID, run.SessionDate)
	run.ProducedInstruments = int(tag.RowsAffected())
	return err
}
