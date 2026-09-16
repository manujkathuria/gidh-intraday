package readapi

import (
	"context"
	"fmt"
)

func (r *Repository) DailyFeatures(ctx context.Context, sessionDate string) ([]DailyFeature, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT i.symbol, f.prior_close, f.prior_high, f.prior_low, f.cpr_pivot, f.cpr_bc, f.cpr_tc, f.atr_14, f.adr_20,
			f.sma_20, f.sma_50, f.return_5d_pct, f.return_20d_pct, f.distance_20d_high_pct, f.distance_20d_low_pct,
			f.average_daily_volume_20, f.volume_dryup_ratio, f.futures_oi_latest, f.futures_oi_change_5d_pct
		FROM market.daily_features f
		JOIN market.instruments i ON i.id = f.instrument_id AND i.is_active
		JOIN market.feature_runs r ON r.id = f.feature_run_id AND r.feature_set = 'DAILY' AND r.status = 'SUCCEEDED'
		JOIN market.data_readiness d ON d.feature_run_id = r.id AND d.status = 'READY'
		WHERE r.session_date = $1::date ORDER BY i.symbol;
	`, sessionDate)
	if err != nil {
		return nil, fmt.Errorf("query daily features: %w", err)
	}
	defer rows.Close()
	features := []DailyFeature{}
	for rows.Next() {
		var f DailyFeature
		if err := rows.Scan(&f.Symbol, &f.PriorClose, &f.PriorHigh, &f.PriorLow, &f.CPRPivot, &f.CPRBC, &f.CPRTC, &f.ATR14, &f.ADR20, &f.SMA20, &f.SMA50, &f.Return5DPct, &f.Return20DPct, &f.Distance20DHighPct, &f.Distance20DLowPct, &f.AverageDailyVolume20, &f.VolumeDryupRatio, &f.FuturesOILatest, &f.FuturesOIChange5DPct); err != nil {
			return nil, err
		}
		features = append(features, f)
	}
	return features, rows.Err()
}

func (r *Repository) IntradayFeatures(ctx context.Context, sessionDate, symbol string, limit int) ([]IntradayFeature, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT * FROM (
			SELECT f.ts, f.cash_open, f.cash_high, f.cash_low, f.cash_close, f.session_vwap, f.vwap_distance_sigma,
				f.opening_range_15_high, f.opening_range_15_low, f.opening_range_30_high, f.opening_range_30_low,
				f.relative_volume, f.realised_volatility_5m, f.realised_volatility_15m, f.realised_volatility_30m,
				f.session_range_pct_atr, f.adr_fuel_used_pct, f.future_close, f.futures_basis, f.futures_basis_pct,
				f.oi_change_1m, f.oi_change_5m, f.oi_change_15m, f.oi_change_session, f.cash_is_complete, f.future_is_complete
			FROM market.intraday_features_1m f
			JOIN market.instruments i ON i.id = f.instrument_id AND i.is_active
			JOIN market.feature_runs r ON r.id = f.feature_run_id AND r.feature_set = 'DAILY' AND r.status = 'SUCCEEDED'
			JOIN market.data_readiness d ON d.feature_run_id = r.id AND d.status = 'READY'
			WHERE r.session_date = $1::date AND i.symbol = $2
			ORDER BY f.ts DESC LIMIT $3
		) latest ORDER BY ts;
	`, sessionDate, symbol, limit)
	if err != nil {
		return nil, fmt.Errorf("query intraday features: %w", err)
	}
	defer rows.Close()
	features := []IntradayFeature{}
	for rows.Next() {
		var f IntradayFeature
		if err := rows.Scan(&f.Timestamp, &f.CashOpen, &f.CashHigh, &f.CashLow, &f.CashClose, &f.SessionVWAP, &f.VWAPDistanceSigma, &f.OpeningRange15High, &f.OpeningRange15Low, &f.OpeningRange30High, &f.OpeningRange30Low, &f.RelativeVolume, &f.RealisedVolatility5M, &f.RealisedVolatility15M, &f.RealisedVolatility30M, &f.SessionRangePctATR, &f.ADRFuelUsedPct, &f.FutureClose, &f.FuturesBasis, &f.FuturesBasisPct, &f.OIChange1M, &f.OIChange5M, &f.OIChange15M, &f.OIChangeSession, &f.CashIsComplete, &f.FutureIsComplete); err != nil {
			return nil, err
		}
		features = append(features, f)
	}
	return features, rows.Err()
}
