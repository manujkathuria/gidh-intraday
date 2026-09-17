package readapi

import (
	"context"
	"fmt"
)

func (r *Repository) FuturesInflow(ctx context.Context, sessionDate string) (*FuturesInflowResponse, error) {
	// Query available session dates
	datesRows, err := r.db.Pool.Query(ctx, `
		SELECT DISTINCT session_date::text as session_date 
		FROM market.future_candles_1d 
		WHERE session_date >= '2026-08-20'
		ORDER BY session_date DESC;
	`)
	if err != nil {
		return nil, fmt.Errorf("query available macro dates: %w", err)
	}
	defer datesRows.Close()

	availableDates := []string{}
	for datesRows.Next() {
		var d string
		if err := datesRows.Scan(&d); err != nil {
			return nil, err
		}
		availableDates = append(availableDates, d)
	}
	if err := datesRows.Err(); err != nil {
		return nil, err
	}

	if sessionDate == "" && len(availableDates) > 0 {
		sessionDate = availableDates[0]
	}

	sql := `
		WITH fut_data AS (
			SELECT 
				fc.instrument_id,
				fc.trading_symbol,
				f1d.session_date,
				f1d.close AS fut_close,
				f1d.open_interest AS fut_oi,
				f1d.volume AS fut_volume,
				LAG(f1d.close, 1) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS prev_close,
				LAG(f1d.open_interest, 1) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS prev_oi,
				LAG(f1d.open_interest, 3) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS oi_3d_ago,
				LAG(f1d.open_interest, 5) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS oi_5d_ago
			FROM market.future_candles_1d f1d
			JOIN market.future_contracts fc ON f1d.future_contract_id = fc.id
			WHERE f1d.session_date <= $1
		),
		exact_session AS (
			SELECT 
				instrument_id,
				trading_symbol,
				session_date,
				fut_close,
				fut_oi,
				prev_close,
				prev_oi,
				ROUND((fut_close * fut_oi / 10000000.0)::numeric, 2) AS total_notional_cr,
				ROUND(((fut_close - prev_close) / NULLIF(prev_close, 0) * 100)::numeric, 2) AS price_1d_pct,
				ROUND(((fut_oi - prev_oi)::numeric / NULLIF(prev_oi, 0) * 100)::numeric, 2) AS oi_1d_pct,
				ROUND(((fut_oi - prev_oi) * fut_close / 10000000.0)::numeric, 2) AS fresh_inflow_1d_cr,
				ROUND(((fut_oi - oi_3d_ago)::numeric / NULLIF(oi_3d_ago, 0) * 100)::numeric, 2) AS oi_3d_pct,
				ROUND(((fut_oi - oi_3d_ago) * fut_close / 10000000.0)::numeric, 2) AS fresh_inflow_3d_cr
			FROM fut_data
			WHERE session_date = $2
		)
		SELECT 
			i.symbol,
			es.trading_symbol,
			es.session_date::text as session_date,
			es.fut_close::float as fut_close,
			COALESCE(es.prev_close::float, es.fut_close::float) as prev_close,
			es.fut_oi::bigint as fut_oi,
			COALESCE(es.prev_oi::bigint, es.fut_oi::bigint) as prev_oi,
			COALESCE(es.total_notional_cr::float, 0) as total_notional_cr,
			COALESCE(es.price_1d_pct::float, 0) as price_1d_pct,
			COALESCE(es.oi_1d_pct::float, 0) as oi_1d_pct,
			COALESCE(es.fresh_inflow_1d_cr::float, 0) as fresh_inflow_1d_cr,
			COALESCE(es.oi_3d_pct::float, 0) as oi_3d_pct,
			COALESCE(es.fresh_inflow_3d_cr::float, 0) as fresh_inflow_3d_cr
		FROM exact_session es
		JOIN market.instruments i ON es.instrument_id = i.id
		ORDER BY es.fresh_inflow_1d_cr DESC NULLS LAST;
	`

	rows, err := r.db.Pool.Query(ctx, sql, sessionDate, sessionDate)
	if err != nil {
		return nil, fmt.Errorf("query futures inflow: %w", err)
	}
	defer rows.Close()

	items := []FuturesInflowItem{}
	for rows.Next() {
		var item FuturesInflowItem
		if err := rows.Scan(
			&item.Symbol,
			&item.TradingSymbol,
			&item.SessionDate,
			&item.FutClose,
			&item.PrevClose,
			&item.FutOI,
			&item.PrevOI,
			&item.TotalNotionalCr,
			&item.Price1DPct,
			&item.OI1DPct,
			&item.FreshInflow1DCr,
			&item.OI3DPct,
			&item.FreshInflow3DCr,
		); err != nil {
			return nil, fmt.Errorf("scan futures inflow row: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &FuturesInflowResponse{
		SessionDate:    sessionDate,
		AvailableDates: availableDates,
		TotalCount:     len(items),
		Data:           items,
	}, nil
}
