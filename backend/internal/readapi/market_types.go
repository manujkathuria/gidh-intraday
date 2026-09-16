package readapi

import (
	"context"
	"time"
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
