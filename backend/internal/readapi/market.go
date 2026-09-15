// Package readapi exposes backend-published market facts to local clients.
package readapi

import (
	"context"
	"fmt"
	"time"

	"gidh-intraday/backend/internal/store"
)

type UniverseItem struct {
	Symbol            string    `json:"symbol"`
	Name              string    `json:"name"`
	CashToken         int64     `json:"cash_token"`
	CashTickSize      float64   `json:"cash_tick_size"`
	FutureToken       int64     `json:"future_token"`
	FutureTradingCode string    `json:"future_trading_code"`
	FutureExpiry      time.Time `json:"future_expiry"`
	FutureLotSize     int       `json:"future_lot_size"`
	FutureTickSize    float64   `json:"future_tick_size"`
}

type Session struct {
	Date           string    `json:"date"`
	FeatureRunID   string    `json:"feature_run_id"`
	FeatureVersion string    `json:"feature_version"`
	PublishedAt    time.Time `json:"published_at"`
}

type DailyFeature struct {
	Symbol               string   `json:"symbol"`
	PriorClose           float64  `json:"prior_close"`
	PriorHigh            float64  `json:"prior_high"`
	PriorLow             float64  `json:"prior_low"`
	CPRPivot             float64  `json:"cpr_pivot"`
	CPRBC                float64  `json:"cpr_bc"`
	CPRTC                float64  `json:"cpr_tc"`
	ATR14                float64  `json:"atr_14"`
	ADR20                float64  `json:"adr_20"`
	SMA20                float64  `json:"sma_20"`
	SMA50                float64  `json:"sma_50"`
	Return5DPct          float64  `json:"return_5d_pct"`
	Return20DPct         float64  `json:"return_20d_pct"`
	Distance20DHighPct   float64  `json:"distance_20d_high_pct"`
	Distance20DLowPct    float64  `json:"distance_20d_low_pct"`
	AverageDailyVolume20 int64    `json:"average_daily_volume_20"`
	VolumeDryupRatio     float64  `json:"volume_dryup_ratio"`
	FuturesOILatest      *int64   `json:"futures_oi_latest"`
	FuturesOIChange5DPct *float64 `json:"futures_oi_change_5d_pct"`
}

type IntradayFeature struct {
	Timestamp             time.Time `json:"timestamp"`
	CashOpen              float64   `json:"cash_open"`
	CashHigh              float64   `json:"cash_high"`
	CashLow               float64   `json:"cash_low"`
	CashClose             float64   `json:"cash_close"`
	SessionVWAP           *float64  `json:"session_vwap"`
	VWAPDistanceSigma     *float64  `json:"vwap_distance_sigma"`
	OpeningRange15High    *float64  `json:"opening_range_15_high"`
	OpeningRange15Low     *float64  `json:"opening_range_15_low"`
	OpeningRange30High    *float64  `json:"opening_range_30_high"`
	OpeningRange30Low     *float64  `json:"opening_range_30_low"`
	RelativeVolume        *float64  `json:"relative_volume"`
	RealisedVolatility5M  *float64  `json:"realised_volatility_5m"`
	RealisedVolatility15M *float64  `json:"realised_volatility_15m"`
	RealisedVolatility30M *float64  `json:"realised_volatility_30m"`
	SessionRangePctATR    *float64  `json:"session_range_pct_atr"`
	ADRFuelUsedPct        *float64  `json:"adr_fuel_used_pct"`
	FutureClose           *float64  `json:"future_close"`
	FuturesBasis          *float64  `json:"futures_basis"`
	FuturesBasisPct       *float64  `json:"futures_basis_pct"`
	OIChange1M            *int64    `json:"oi_change_1m"`
	OIChange5M            *int64    `json:"oi_change_5m"`
	OIChange15M           *int64    `json:"oi_change_15m"`
	OIChangeSession       *int64    `json:"oi_change_session"`
	CashIsComplete        bool      `json:"cash_is_complete"`
	FutureIsComplete      bool      `json:"future_is_complete"`
}

type DailyFocusItem struct {
	FocusListID    string    `json:"focus_list_id"`
	SessionDate    string    `json:"session_date"`
	FeatureRunID   string    `json:"feature_run_id"`
	PolicyVersion  string    `json:"policy_version"`
	PublishedAt    time.Time `json:"published_at"`
	Symbol         string    `json:"symbol"`
	Rank           int       `json:"rank"`
	State          string    `json:"state"`
	AttentionScore float64   `json:"attention_score"`
}

type BrainRuleItem struct {
	ID           string   `json:"id"`
	Category     string   `json:"category"`
	Name         string   `json:"name"`
	Confidence   float64  `json:"confidence"`
	TriggerTime  string   `json:"triggerTime,omitempty"`
	Conditions   []string `json:"conditions"`
	Action       string   `json:"action"`
	Invalidation string   `json:"invalidation,omitempty"`
	Notes        string   `json:"notes,omitempty"`
}

type OperatingScheduleItem struct {
	ID             int    `json:"id"`
	CheckpointTime string `json:"time"`
	TimeWindow     string `json:"time_window"`
	SequenceOrder  int    `json:"sequence_order"`
	PhaseName      string `json:"title"`
	TriggerEvent   string `json:"trigger_event"`
	RequiredAction string `json:"desc"`
	RiskConstraint string `json:"risk_constraint"`
	Status         string `json:"status"`
}

type MarketReader interface {
	Ping(context.Context) error
	Universe(context.Context) ([]UniverseItem, error)
	Sessions(context.Context) ([]Session, error)
	DailyFeatures(context.Context, string) ([]DailyFeature, error)
	IntradayFeatures(context.Context, string, string, int) ([]IntradayFeature, error)
	DailyFocus(context.Context, string) ([]DailyFocusItem, error)
	QuantBrainRules(context.Context) ([]BrainRuleItem, error)
	QuantOperatingSchedule(context.Context) ([]OperatingScheduleItem, error)
	ReplaySnapshot(ctx context.Context, sessionDate, asOfTime string) (*ReplaySnapshotResponse, error)
	ReplayCandles(ctx context.Context, sessionDate, symbol, toTime, interval string) ([]ReplayCandle, error)
	WarmSessionDay(ctx context.Context, sessionDate string) error
}

func (r *Repository) DailyFocus(ctx context.Context, sessionDate string) ([]DailyFocusItem, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT l.id::text, l.session_date::text, l.feature_run_id::text, run.policy_version, l.published_at,
			i.symbol, item.rank, item.state, item.attention_score
		FROM ai.daily_focus_lists l
		JOIN ai.research_runs run ON run.id = l.research_run_id AND run.status = 'SUCCEEDED'
		JOIN ai.daily_focus_list_items item ON item.focus_list_id = l.id
		JOIN market.instruments i ON i.id = item.instrument_id
		WHERE l.session_date = $1::date AND l.status = 'PUBLISHED'
		ORDER BY l.published_at DESC, item.rank ASC;
	`, sessionDate)
	if err != nil {
		return nil, fmt.Errorf("query daily focus: %w", err)
	}
	defer rows.Close()
	items := []DailyFocusItem{}
	for rows.Next() {
		var item DailyFocusItem
		if err := rows.Scan(&item.FocusListID, &item.SessionDate, &item.FeatureRunID, &item.PolicyVersion, &item.PublishedAt, &item.Symbol, &item.Rank, &item.State, &item.AttentionScore); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) QuantBrainRules(ctx context.Context) ([]BrainRuleItem, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT rule_id, category, name, confidence, condition_json, action, COALESCE(invalidation, ''), evidence
		FROM quant.brain_rules
		WHERE status = 'ACTIVE'
		ORDER BY 
			CASE category 
				WHEN 'ALLOCATION' THEN 1 
				WHEN 'ENTRY' THEN 2 
				WHEN 'INVALIDATION' THEN 3 
				WHEN 'HOLD' THEN 4 
				WHEN 'NO_TRADE' THEN 5 
				WHEN 'CHARACTER' THEN 6 
				WHEN 'BATTALION' THEN 7 
				ELSE 8 
			END, 
			confidence DESC;
	`)
	if err != nil {
		return nil, fmt.Errorf("query brain rules: %w", err)
	}
	defer rows.Close()

	var rules []BrainRuleItem
	for rows.Next() {
		var item BrainRuleItem
		var condMap map[string]interface{}
		var invalidation, evidence string
		if err := rows.Scan(&item.ID, &item.Category, &item.Name, &item.Confidence, &condMap, &item.Action, &invalidation, &evidence); err != nil {
			return nil, err
		}
		item.Invalidation = invalidation
		item.Notes = evidence

		// Parse condition_json into clean human-readable bullet strings
		var conditions []string
		if chk, ok := condMap["checkpoint"].(string); ok && chk != "" {
			item.TriggerTime = chk
		}
		for k, v := range condMap {
			if k == "checkpoint" {
				continue
			}
			conditions = append(conditions, fmt.Sprintf("%s: %v", k, v))
		}
		item.Conditions = conditions
		rules = append(rules, item)
	}
	return rules, rows.Err()
}

func (r *Repository) QuantOperatingSchedule(ctx context.Context) ([]OperatingScheduleItem, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, checkpoint_time, time_window, sequence_order, phase_name, trigger_event, required_action, risk_constraint, status
		FROM quant.operating_schedule
		ORDER BY sequence_order ASC;
	`)
	if err != nil {
		return nil, fmt.Errorf("query operating schedule: %w", err)
	}
	defer rows.Close()

	var schedule []OperatingScheduleItem
	for rows.Next() {
		var item OperatingScheduleItem
		if err := rows.Scan(&item.ID, &item.CheckpointTime, &item.TimeWindow, &item.SequenceOrder, &item.PhaseName, &item.TriggerEvent, &item.RequiredAction, &item.RiskConstraint, &item.Status); err != nil {
			return nil, err
		}
		schedule = append(schedule, item)
	}
	return schedule, rows.Err()
}

type Repository struct {
	db    *store.DB
	redis *RedisCache
}

func NewRepository(db *store.DB) *Repository {
	repo := &Repository{
		db:    db,
		redis: NewRedisCache(),
	}
	if repo.redis != nil {
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			_ = repo.PrepopulatePreopenBaselines(ctx)
		}()
	}
	return repo
}

func (r *Repository) Ping(ctx context.Context) error { return r.db.Pool.Ping(ctx) }

func (r *Repository) Universe(ctx context.Context) ([]UniverseItem, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT i.symbol, i.name, i.cash_token, i.tick_size, f.token, f.trading_symbol, f.expiry, f.lot_size, f.tick_size
		FROM market.instruments i
		JOIN market.future_contracts f ON f.instrument_id = i.id AND f.is_active
		WHERE i.is_active ORDER BY i.symbol;
	`)
	if err != nil {
		return nil, fmt.Errorf("query universe: %w", err)
	}
	defer rows.Close()
	items := []UniverseItem{}
	for rows.Next() {
		var item UniverseItem
		if err := rows.Scan(&item.Symbol, &item.Name, &item.CashToken, &item.CashTickSize, &item.FutureToken, &item.FutureTradingCode, &item.FutureExpiry, &item.FutureLotSize, &item.FutureTickSize); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) Sessions(ctx context.Context) ([]Session, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT r.session_date::text, r.id::text, r.feature_version, r.finished_at
		FROM market.feature_runs r
		JOIN market.data_readiness d ON d.feature_run_id = r.id AND d.status = 'READY'
		WHERE r.feature_set = 'DAILY' AND r.status = 'SUCCEEDED'
		ORDER BY r.session_date DESC;
	`)
	if err != nil {
		return nil, fmt.Errorf("query published sessions: %w", err)
	}
	defer rows.Close()
	sessions := []Session{}
	for rows.Next() {
		var session Session
		if err := rows.Scan(&session.Date, &session.FeatureRunID, &session.FeatureVersion, &session.PublishedAt); err != nil {
			return nil, err
		}
		sessions = append(sessions, session)
	}
	return sessions, rows.Err()
}

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
