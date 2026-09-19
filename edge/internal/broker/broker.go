package broker

import (
	"context"
	"time"
)

type MarketOrderRequest struct {
	Exchange        string
	Symbol          string
	TransactionType string
	Quantity        int
	Tag             string
	ReferencePrice  float64
}

type BrokerOrder struct {
	OrderID         string
	Status          string
	StatusMessage   string
	Exchange        string
	Symbol          string
	TransactionType string
	Quantity        int
	FilledQuantity  int
	AveragePrice    float64
	Tag             string
	UpdatedAt       time.Time
}

type BrokerPosition struct {
	Exchange        string
	Symbol          string
	InstrumentToken uint32
	Quantity        int
	AveragePrice    float64
	LastPrice       float64
	PnL             float64
}

type Broker interface {
	PlaceMISMarketOrder(context.Context, MarketOrderRequest) (BrokerOrder, error)
	GetOrder(context.Context, string) (BrokerOrder, error)
	GetOrders(context.Context) ([]BrokerOrder, error)
	GetPositions(context.Context) ([]BrokerPosition, error)
	Quote(context.Context, string, string) (float64, error)
}
