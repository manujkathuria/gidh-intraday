package ordermanager

import "time"

type PositionSide string

const (
	SideLong  PositionSide = "LONG"
	SideShort PositionSide = "SHORT"
)

type ActivePosition struct {
	Symbol          string       `json:"symbol"`
	InstrumentToken uint32       `json:"instrument_token"`
	Exchange        string       `json:"exchange"`
	Side            PositionSide `json:"side"`
	Quantity        int          `json:"quantity"`
	EntryPrice      float64      `json:"entry_price"`
	CurrentLTP      float64      `json:"current_ltp"`
	PnLINR          float64      `json:"pnl_inr"`
	PnLPct          float64      `json:"pnl_pct"`
	MFEPct          float64      `json:"mfe_pct"`          // Maximum Favorable Excursion
	StopFloorPct    float64      `json:"stop_floor_pct"`   // Ratcheted stop floor (0.0% for BE, +1.0%, +2.5%)
	Tactic          string       `json:"tactic"`           // e.g. PALADIN_01, TRAP_SHORT_03
	Invalidation    string       `json:"invalidation"`     // Invalidation condition
	BrokerOrderID   string       `json:"broker_order_id"`
	OpenedAt        time.Time    `json:"opened_at"`
	UpdatedAt       time.Time    `json:"updated_at"`
}

type OrderRecord struct {
	OrderID      string    `json:"order_id"`
	Symbol       string    `json:"symbol"`
	Side         string    `json:"side"`       // BUY / SELL
	Quantity     int       `json:"quantity"`
	OrderType    string    `json:"order_type"` // MARKET / LIMIT
	Product      string    `json:"product"`    // MIS / CNC
	Status       string    `json:"status"`     // COMPLETE / REJECTED / CANCELLED / OPEN
	AveragePrice float64   `json:"average_price"`
	StatusMsg    string    `json:"status_message,omitempty"`
	Tag          string    `json:"tag"`
	PlacedAt     time.Time `json:"placed_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type RiskState struct {
	CapitalPool       float64 `json:"capital_pool"`
	LeverageMIS       float64 `json:"leverage_mis"`
	GrossExposureCap  float64 `json:"gross_exposure_cap"`
	MaxSlots          int     `json:"max_slots"`
	MarginPerSlot     float64 `json:"margin_per_slot"`
	SlotsUsed         int     `json:"slots_used"`
	MarginUsed        float64 `json:"margin_used"`
	DailyRealizedPnL  float64 `json:"daily_realized_pnl"`
	DailyUnrealizedPnL float64 `json:"daily_unrealized_pnl"`
	TotalDailyPnL     float64 `json:"total_daily_pnl"`
	CircuitBroken     bool    `json:"circuit_broken"`
}

type OrderIntent struct {
	Symbol       string       `json:"symbol"`
	Side         PositionSide `json:"side"`
	MarginINR    float64      `json:"margin_inr"`
	Tactic       string       `json:"tactic"`
	Invalidation string       `json:"invalidation"`
}

type LiveEvent struct {
	Type      string      `json:"type"` // "TICK", "ORDER_UPDATE", "POSITION_UPDATE", "RATCHET_ALERT", "CIRCUIT_ALERT"
	Timestamp time.Time   `json:"timestamp"`
	Payload   interface{} `json:"payload"`
}
