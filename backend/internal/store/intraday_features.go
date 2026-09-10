package store

import "context"

// BuildIntraday replays raw completed one-minute bars into neutral market-state
// facts. It reads the preceding 40 calendar days only to form the 20-session
// minute-of-day volume profile; it writes rows exclusively for [from, to].
func (r *DailyFeatureRepo) BuildIntraday(ctx context.Context, from, to string) (int64, error) {
	tag, err := r.db.Pool.Exec(ctx, `
		WITH cash_base AS (
			SELECT c.*, (c.ts AT TIME ZONE 'Asia/Kolkata')::date AS session_date,
				(c.ts AT TIME ZONE 'Asia/Kolkata')::time AS minute_of_day
			FROM market.cash_candles_1m c
			JOIN market.instruments i ON i.id = c.instrument_id AND i.is_active
			WHERE c.ts >= ((($1::date - 40)::timestamp) AT TIME ZONE 'Asia/Kolkata')
				AND c.ts < (($2::date + 1)::timestamp AT TIME ZONE 'Asia/Kolkata')
		), cash_numbered AS (
			SELECT *, ROW_NUMBER() OVER (PARTITION BY instrument_id, session_date ORDER BY ts) - 1 AS minutes_since_open
			FROM cash_base
		), cash_session AS (
			SELECT *,
				FIRST_VALUE(open) OVER session_window AS session_open,
				MAX(high) OVER session_window AS session_high,
				MIN(low) OVER session_window AS session_low,
				SUM(volume) OVER session_window AS cumulative_volume,
				SUM(close * volume) OVER session_window AS cumulative_price_volume,
				SUM(close * close * volume) OVER session_window AS cumulative_price_squared_volume,
				MAX(high) FILTER (WHERE minutes_since_open < 15) OVER session_window AS raw_opening_range_15_high,
				MIN(low) FILTER (WHERE minutes_since_open < 15) OVER session_window AS raw_opening_range_15_low,
				MAX(high) FILTER (WHERE minutes_since_open < 30) OVER session_window AS raw_opening_range_30_high,
				MIN(low) FILTER (WHERE minutes_since_open < 30) OVER session_window AS raw_opening_range_30_low,
				LAG(close) OVER session_window AS previous_close
			FROM cash_numbered
			WINDOW session_window AS (
				PARTITION BY instrument_id, session_date ORDER BY ts
				ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
			)
		), cash_vwap AS (
			SELECT *,
				cumulative_price_volume / NULLIF(cumulative_volume, 0) AS session_vwap,
				SQRT(GREATEST(
					cumulative_price_squared_volume / NULLIF(cumulative_volume, 0) -
					POWER(cumulative_price_volume / NULLIF(cumulative_volume, 0), 2),
					0
				)) AS vwap_sigma
			FROM cash_session
		), cash_returns AS (
			SELECT *, LN(close / NULLIF(previous_close, 0)) AS log_return
			FROM cash_vwap
		), cash_metrics AS (
			SELECT *,
				STDDEV_SAMP(log_return) OVER (PARTITION BY instrument_id, session_date ORDER BY ts ROWS BETWEEN 4 PRECEDING AND CURRENT ROW) AS realised_volatility_5m,
				STDDEV_SAMP(log_return) OVER (PARTITION BY instrument_id, session_date ORDER BY ts ROWS BETWEEN 14 PRECEDING AND CURRENT ROW) AS realised_volatility_15m,
				STDDEV_SAMP(log_return) OVER (PARTITION BY instrument_id, session_date ORDER BY ts ROWS BETWEEN 29 PRECEDING AND CURRENT ROW) AS realised_volatility_30m
			FROM cash_returns
		), cash_expected_volume AS (
			SELECT *, AVG(cumulative_volume) OVER (
				PARTITION BY instrument_id, minute_of_day ORDER BY session_date
				ROWS BETWEEN 20 PRECEDING AND 1 PRECEDING
			) AS expected_cumulative_volume
			FROM cash_metrics
		), future_metrics AS (
			SELECT c.ts, c.source_ts, c.is_complete, c.future_contract_id, c.close, c.open_interest,
				LAG(c.open_interest) OVER session_window AS oi_1m_ago,
				LAG(c.open_interest, 5) OVER session_window AS oi_5m_ago,
				LAG(c.open_interest, 15) OVER session_window AS oi_15m_ago,
				FIRST_VALUE(c.open_interest) OVER session_window AS session_open_interest
			FROM market.future_candles_1m c
			JOIN market.future_contracts f ON f.id = c.future_contract_id AND f.is_active
			WHERE c.ts >= ($1::date::timestamp AT TIME ZONE 'Asia/Kolkata')
				AND c.ts < (($2::date + 1)::timestamp AT TIME ZONE 'Asia/Kolkata')
			WINDOW session_window AS (
				PARTITION BY c.future_contract_id, (c.ts AT TIME ZONE 'Asia/Kolkata')::date ORDER BY c.ts
				ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
			)
		)
		INSERT INTO market.intraday_features_1m (
			ts, feature_run_id, instrument_id, cash_source_ts, future_source_ts, cash_is_complete, future_is_complete,
			cash_open, cash_high, cash_low, cash_close, session_open, session_high, session_low, minutes_since_open,
			opening_range_15_high, opening_range_15_low, opening_range_30_high, opening_range_30_low,
			session_vwap, vwap_sigma, vwap_upper_1, vwap_lower_1, vwap_upper_2, vwap_lower_2, vwap_distance_sigma,
			bar_range, bar_body, clv, upper_wick_pct, lower_wick_pct,
			cumulative_volume, expected_cumulative_volume, relative_volume,
			realised_volatility_5m, realised_volatility_15m, realised_volatility_30m,
			session_range_pct_atr, adr_fuel_used_pct, future_contract_id, future_close, futures_basis, futures_basis_pct,
			oi_change_1m, oi_change_5m, oi_change_15m, oi_change_session
		)
		SELECT c.ts, run.id, c.instrument_id, c.source_ts, f.source_ts, c.is_complete, COALESCE(f.is_complete, FALSE),
			c.open, c.high, c.low, c.close, c.session_open, c.session_high, c.session_low, c.minutes_since_open,
			CASE WHEN c.minutes_since_open >= 14 THEN c.raw_opening_range_15_high END,
			CASE WHEN c.minutes_since_open >= 14 THEN c.raw_opening_range_15_low END,
			CASE WHEN c.minutes_since_open >= 29 THEN c.raw_opening_range_30_high END,
			CASE WHEN c.minutes_since_open >= 29 THEN c.raw_opening_range_30_low END,
			c.session_vwap, c.vwap_sigma,
			c.session_vwap + c.vwap_sigma, c.session_vwap - c.vwap_sigma,
			c.session_vwap + 2 * c.vwap_sigma, c.session_vwap - 2 * c.vwap_sigma,
			(c.close - c.session_vwap) / NULLIF(c.vwap_sigma, 0),
			c.high - c.low, c.close - c.open,
			(c.close - c.low) / NULLIF(c.high - c.low, 0),
			(c.high - GREATEST(c.open, c.close)) / NULLIF(c.high - c.low, 0),
			(LEAST(c.open, c.close) - c.low) / NULLIF(c.high - c.low, 0),
			c.cumulative_volume, c.expected_cumulative_volume::bigint,
			c.cumulative_volume / NULLIF(c.expected_cumulative_volume, 0),
			c.realised_volatility_5m, c.realised_volatility_15m, c.realised_volatility_30m,
			(c.session_high - c.session_low) / NULLIF(d.atr_14, 0),
			(c.session_high - c.session_low) / NULLIF(d.adr_20, 0),
			f.future_contract_id, f.close, f.close - c.close,
			(f.close - c.close) / NULLIF(c.close, 0) * 100,
			f.open_interest - f.oi_1m_ago, f.open_interest - f.oi_5m_ago,
			f.open_interest - f.oi_15m_ago, f.open_interest - f.session_open_interest
		FROM cash_expected_volume c
		JOIN market.feature_runs run ON run.feature_set = 'DAILY' AND run.session_date = c.session_date AND run.status = 'SUCCEEDED'
		JOIN market.daily_features d ON d.feature_run_id = run.id AND d.instrument_id = c.instrument_id
		LEFT JOIN market.future_contracts active_future ON active_future.instrument_id = c.instrument_id AND active_future.is_active
		LEFT JOIN future_metrics f ON f.ts = c.ts AND f.future_contract_id = active_future.id
		WHERE c.session_date BETWEEN $1::date AND $2::date
		ON CONFLICT (ts, feature_run_id, instrument_id) DO UPDATE SET
			cash_source_ts = EXCLUDED.cash_source_ts, future_source_ts = EXCLUDED.future_source_ts,
			cash_is_complete = EXCLUDED.cash_is_complete, future_is_complete = EXCLUDED.future_is_complete,
			cash_open = EXCLUDED.cash_open, cash_high = EXCLUDED.cash_high, cash_low = EXCLUDED.cash_low, cash_close = EXCLUDED.cash_close,
			session_open = EXCLUDED.session_open, session_high = EXCLUDED.session_high, session_low = EXCLUDED.session_low,
			minutes_since_open = EXCLUDED.minutes_since_open,
			opening_range_15_high = EXCLUDED.opening_range_15_high, opening_range_15_low = EXCLUDED.opening_range_15_low,
			opening_range_30_high = EXCLUDED.opening_range_30_high, opening_range_30_low = EXCLUDED.opening_range_30_low,
			session_vwap = EXCLUDED.session_vwap, vwap_sigma = EXCLUDED.vwap_sigma,
			vwap_upper_1 = EXCLUDED.vwap_upper_1, vwap_lower_1 = EXCLUDED.vwap_lower_1,
			vwap_upper_2 = EXCLUDED.vwap_upper_2, vwap_lower_2 = EXCLUDED.vwap_lower_2,
			vwap_distance_sigma = EXCLUDED.vwap_distance_sigma, bar_range = EXCLUDED.bar_range, bar_body = EXCLUDED.bar_body,
			clv = EXCLUDED.clv, upper_wick_pct = EXCLUDED.upper_wick_pct, lower_wick_pct = EXCLUDED.lower_wick_pct,
			cumulative_volume = EXCLUDED.cumulative_volume, expected_cumulative_volume = EXCLUDED.expected_cumulative_volume,
			relative_volume = EXCLUDED.relative_volume, realised_volatility_5m = EXCLUDED.realised_volatility_5m,
			realised_volatility_15m = EXCLUDED.realised_volatility_15m, realised_volatility_30m = EXCLUDED.realised_volatility_30m,
			session_range_pct_atr = EXCLUDED.session_range_pct_atr, adr_fuel_used_pct = EXCLUDED.adr_fuel_used_pct,
			future_contract_id = EXCLUDED.future_contract_id, future_close = EXCLUDED.future_close,
			futures_basis = EXCLUDED.futures_basis, futures_basis_pct = EXCLUDED.futures_basis_pct,
			oi_change_1m = EXCLUDED.oi_change_1m, oi_change_5m = EXCLUDED.oi_change_5m,
			oi_change_15m = EXCLUDED.oi_change_15m, oi_change_session = EXCLUDED.oi_change_session;
	`, from, to)
	return tag.RowsAffected(), err
}
