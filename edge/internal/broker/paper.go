package broker

import (
	"context"
	"fmt"
	"sync"
	"time"
)

type Paper struct {
	mu     sync.RWMutex
	orders map[string]BrokerOrder
}

func NewPaper() *Paper {
	return &Paper{orders: make(map[string]BrokerOrder)}
}

func (p *Paper) PlaceMISMarketOrder(_ context.Context, req MarketOrderRequest) (BrokerOrder, error) {
	if req.ReferencePrice <= 0 {
		return BrokerOrder{}, fmt.Errorf("paper order requires a positive reference price")
	}
	order := BrokerOrder{
		OrderID:         fmt.Sprintf("PAPER-%d", time.Now().UnixNano()),
		Status:          "COMPLETE",
		Exchange:        req.Exchange,
		Symbol:          req.Symbol,
		TransactionType: req.TransactionType,
		Quantity:        req.Quantity,
		FilledQuantity:  req.Quantity,
		AveragePrice:    req.ReferencePrice,
		Tag:             req.Tag,
		UpdatedAt:       time.Now(),
	}
	p.mu.Lock()
	p.orders[order.OrderID] = order
	p.mu.Unlock()
	return order, nil
}

func (p *Paper) GetOrder(_ context.Context, orderID string) (BrokerOrder, error) {
	p.mu.RLock()
	defer p.mu.RUnlock()
	order, ok := p.orders[orderID]
	if !ok {
		return BrokerOrder{}, fmt.Errorf("paper order %s not found", orderID)
	}
	return order, nil
}

func (p *Paper) GetOrders(context.Context) ([]BrokerOrder, error) {
	p.mu.RLock()
	defer p.mu.RUnlock()
	orders := make([]BrokerOrder, 0, len(p.orders))
	for _, order := range p.orders {
		orders = append(orders, order)
	}
	return orders, nil
}

func (p *Paper) GetPositions(context.Context) ([]BrokerPosition, error) { return nil, nil }

func (p *Paper) Quote(_ context.Context, _, _ string) (float64, error) {
	return 0, fmt.Errorf("paper broker has no quote source")
}
