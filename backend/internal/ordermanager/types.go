package ordermanager

import "time"

type TradeSide string

const (
	SideLong  TradeSide = "LONG"
	SideShort TradeSide = "SHORT"
)

type ManagedOrderType string

const (
	OrderTypeMarket         ManagedOrderType = "MARKET"
	OrderTypeSyntheticLimit ManagedOrderType = "SYNTHETIC_LIMIT"
)

type ManagedOrderStatus string

const (
	StatusPending           ManagedOrderStatus = "PENDING"
	StatusTriggering        ManagedOrderStatus = "TRIGGERING"
	StatusSubmitting        ManagedOrderStatus = "SUBMITTING"
	StatusSubmitted         ManagedOrderStatus = "SUBMITTED"
	StatusFilled            ManagedOrderStatus = "FILLED"
	StatusRejected          ManagedOrderStatus = "REJECTED"
	StatusCancelled         ManagedOrderStatus = "CANCELLED"
	StatusReconcileRequired ManagedOrderStatus = "RECONCILE_REQUIRED"
	StatusExitSubmitted     ManagedOrderStatus = "EXIT_SUBMITTED"
	StatusClosed            ManagedOrderStatus = "CLOSED"
)

type Instrument struct {
	Symbol   string
	Exchange string
	Token    uint32
}

type ManagedOrder struct {
	ID                  string             `json:"id"`
	ClientOrderID       string             `json:"client_order_id"`
	BrokerOrderID       string             `json:"broker_order_id,omitempty"`
	BrokerTag           string             `json:"broker_tag,omitempty"`
	OrderType           ManagedOrderType   `json:"order_type"`
	Status              ManagedOrderStatus `json:"status"`
	Symbol              string             `json:"symbol"`
	InstrumentToken     uint32             `json:"instrument_token"`
	Exchange            string             `json:"exchange"`
	Side                TradeSide          `json:"side"`
	Quantity            int                `json:"quantity"`
	MarginINR           float64            `json:"margin_inr"`
	LimitPrice          float64            `json:"limit_price,omitempty"`
	ReferencePrice      float64            `json:"reference_price,omitempty"`
	ExpectedStopPrice   float64            `json:"expected_stop_price,omitempty"`
	ExpectedTargetPrice float64            `json:"expected_target_price,omitempty"`
	ActualFillPrice     float64            `json:"actual_fill_price,omitempty"`
	StopPrice           float64            `json:"stop_price,omitempty"`
	TargetPrice         float64            `json:"target_price,omitempty"`
	Tactic              string             `json:"tactic,omitempty"`
	Invalidation        string             `json:"invalidation"`
	InitiatedBy         string             `json:"initiated_by,omitempty"`
	RejectionReason     string             `json:"rejection_reason,omitempty"`
	IsExit              bool               `json:"is_exit,omitempty"`
	Revision            int64              `json:"revision"`
	CreatedAt           time.Time          `json:"created_at"`
	UpdatedAt           time.Time          `json:"updated_at"`
	TriggeredAt         *time.Time         `json:"triggered_at,omitempty"`
	SubmittedAt         *time.Time         `json:"submitted_at,omitempty"`
	FilledAt            *time.Time         `json:"filled_at,omitempty"`
}

type ActivePosition struct {
	Symbol          string    `json:"symbol"`
	InstrumentToken uint32    `json:"instrument_token"`
	Exchange        string    `json:"exchange"`
	Side            TradeSide `json:"side"`
	Quantity        int       `json:"quantity"`
	EntryPrice      float64   `json:"entry_price"`
	CurrentLTP      float64   `json:"current_ltp"`
	PnLINR          float64   `json:"pnl_inr"`
	PnLPct          float64   `json:"pnl_pct"`
	MFEPct          float64   `json:"mfe_pct"`
	StopFloorPct    float64   `json:"stop_floor_pct"`
	StopLossPrice   float64   `json:"stop_loss_price"`
	TargetPrice     float64   `json:"target_price"`
	Tactic          string    `json:"tactic,omitempty"`
	Invalidation    string    `json:"invalidation"`
	BrokerOrderID   string    `json:"broker_order_id"`
	OpenedAt        time.Time `json:"opened_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type ClosedPosition struct {
	ID              string    `json:"id"`
	Symbol          string    `json:"symbol"`
	Exchange        string    `json:"exchange"`
	InstrumentToken uint32    `json:"instrument_token"`
	Side            TradeSide `json:"side"`
	Quantity        int       `json:"quantity"`
	EntryPrice      float64   `json:"entry_price"`
	ExitPrice       float64   `json:"exit_price"`
	PnLINR          float64   `json:"pnl_inr"`
	PnLPct          float64   `json:"pnl_pct"`
	OpenedAt        time.Time `json:"opened_at"`
	ClosedAt        time.Time `json:"closed_at"`
	ExitReason      string    `json:"exit_reason"`
	BrokerOrderID   string    `json:"broker_order_id,omitempty"`
}

type PlaceMarketInput struct {
	ClientOrderID string
	Symbol        string
	Side          TradeSide
	MarginINR     float64
	Tactic        string
	Invalidation  string
	InitiatedBy   string
}

type PlaceLimitInput struct {
	PlaceMarketInput
	LimitPrice float64
}

type RiskState struct {
	KillSwitch    bool   `json:"kill_switch"`
	CircuitBroken bool   `json:"circuit_broken"`
	Reason        string `json:"reason,omitempty"`
}
