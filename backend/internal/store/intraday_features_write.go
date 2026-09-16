package store

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
)

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
