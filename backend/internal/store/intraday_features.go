package store

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

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

type IntradayFeatureRecord struct {
	Timestamp             time.Time
	FeatureRunID          string
	InstrumentID          int64
	CashSourceTS          time.Time
	FutureSourceTS        *time.Time
	CashIsComplete        bool
	FutureIsComplete      bool
	CashOpen              float64
	CashHigh              float64
	CashLow               float64
	CashClose             float64
	SessionOpen           float64
	SessionHigh           float64
	SessionLow            float64
	MinutesSinceOpen      int16
	OpeningRange15High    *float64
	OpeningRange15Low     *float64
	OpeningRange30High    *float64
	OpeningRange30Low     *float64
	SessionVWAP           *float64
	VWAPSigma             *float64
	VWAPUpper1            *float64
	VWAPLower1            *float64
	VWAPUpper2            *float64
	VWAPLower2            *float64
	VWAPDistanceSigma     *float64
	BarRange              float64
	BarBody               float64
	CLV                   *float64
	UpperWickPct          *float64
	LowerWickPct          *float64
	CumulativeVolume      int64
	ExpectedCumulativeVol *int64
	RelativeVolume        *float64
	RealisedVolatility5M  *float64
	RealisedVolatility15M *float64
	RealisedVolatility30M *float64
	SessionRangePctATR    *float64
	ADRFuelUsedPct        *float64
	FutureContractID      *int64
	FutureClose           *float64
	FuturesBasis          *float64
	FuturesBasisPct       *float64
	OIChange1M            *int64
	OIChange5M            *int64
	OIChange15M           *int64
	OIChangeSession       *int64
}

type DailyFeatureBaseline struct {
	InstrumentID int64
	Symbol       string
	PriorClose   float64
	ATR14        float64
	ADR20        float64
}

func (r *DailyFeatureRepo) UpsertIntradayFeaturesBulk(ctx context.Context, records []IntradayFeatureRecord) error {
	if len(records) == 0 {
		return nil
	}
	batch := &pgx.Batch{}
	query := `
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
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
			$16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31,
			$32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47
		)
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
	`
	for _, rec := range records {
		batch.Queue(query,
			rec.Timestamp, rec.FeatureRunID, rec.InstrumentID, rec.CashSourceTS, rec.FutureSourceTS, rec.CashIsComplete, rec.FutureIsComplete,
			rec.CashOpen, rec.CashHigh, rec.CashLow, rec.CashClose, rec.SessionOpen, rec.SessionHigh, rec.SessionLow, rec.MinutesSinceOpen,
			rec.OpeningRange15High, rec.OpeningRange15Low, rec.OpeningRange30High, rec.OpeningRange30Low,
			rec.SessionVWAP, rec.VWAPSigma, rec.VWAPUpper1, rec.VWAPLower1, rec.VWAPUpper2, rec.VWAPLower2, rec.VWAPDistanceSigma,
			rec.BarRange, rec.BarBody, rec.CLV, rec.UpperWickPct, rec.LowerWickPct,
			rec.CumulativeVolume, rec.ExpectedCumulativeVol, rec.RelativeVolume,
			rec.RealisedVolatility5M, rec.RealisedVolatility15M, rec.RealisedVolatility30M,
			rec.SessionRangePctATR, rec.ADRFuelUsedPct, rec.FutureContractID, rec.FutureClose, rec.FuturesBasis, rec.FuturesBasisPct,
			rec.OIChange1M, rec.OIChange5M, rec.OIChange15M, rec.OIChangeSession,
		)
	}

	results := r.db.Pool.SendBatch(ctx, batch)
	defer results.Close()
	for i := 0; i < batch.Len(); i++ {
		if _, err := results.Exec(); err != nil {
			return err
		}
	}
	return nil
}

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
