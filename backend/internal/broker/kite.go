package broker

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/zerodha/gokiteconnect/v4"
)

type Kite struct {
	client  *kiteconnect.Client
	mu      sync.Mutex
	lastReq time.Time
}

func NewKite(apiKey, accessToken string) *Kite {
	client := kiteconnect.New(apiKey)
	client.SetAccessToken(accessToken)
	return &Kite{client: client}
}

func (k *Kite) wait(ctx context.Context) error {
	k.mu.Lock()
	defer k.mu.Unlock()

	delay := 350*time.Millisecond - time.Since(k.lastReq)
	if delay > 0 {
		timer := time.NewTimer(delay)
		defer timer.Stop()
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-timer.C:
		}
	}
	k.lastReq = time.Now()
	return nil
}

func (k *Kite) PlaceMISMarketOrder(ctx context.Context, req MarketOrderRequest) (BrokerOrder, error) {
	if err := k.wait(ctx); err != nil {
		return BrokerOrder{}, err
	}
	resp, err := k.client.PlaceOrder("regular", kiteconnect.OrderParams{
		Exchange:         req.Exchange,
		Tradingsymbol:    req.Symbol,
		TransactionType:  req.TransactionType,
		Quantity:         req.Quantity,
		Product:          kiteconnect.ProductMIS,
		OrderType:        kiteconnect.OrderTypeMarket,
		Validity:         kiteconnect.ValidityDay,
		MarketProtection: -1,
		Tag:              req.Tag,
	})
	if err != nil {
		return BrokerOrder{}, fmt.Errorf("kite place market order: %w", err)
	}
	return BrokerOrder{
		OrderID:         resp.OrderID,
		Status:          "SUBMITTED",
		Exchange:        req.Exchange,
		Symbol:          req.Symbol,
		TransactionType: req.TransactionType,
		Quantity:        req.Quantity,
		Tag:             req.Tag,
		UpdatedAt:       time.Now(),
	}, nil
}

func (k *Kite) GetOrder(ctx context.Context, orderID string) (BrokerOrder, error) {
	if err := k.wait(ctx); err != nil {
		return BrokerOrder{}, err
	}
	history, err := k.client.GetOrderHistory(orderID)
	if err != nil {
		return BrokerOrder{}, fmt.Errorf("kite get order %s: %w", orderID, err)
	}
	if len(history) == 0 {
		return BrokerOrder{}, fmt.Errorf("kite order %s not found", orderID)
	}
	return mapOrder(history[len(history)-1]), nil
}

func (k *Kite) GetOrders(ctx context.Context) ([]BrokerOrder, error) {
	if err := k.wait(ctx); err != nil {
		return nil, err
	}
	orders, err := k.client.GetOrders()
	if err != nil {
		return nil, fmt.Errorf("kite get orders: %w", err)
	}
	result := make([]BrokerOrder, 0, len(orders))
	for _, order := range orders {
		result = append(result, mapOrder(order))
	}
	return result, nil
}

func (k *Kite) GetPositions(ctx context.Context) ([]BrokerPosition, error) {
	if err := k.wait(ctx); err != nil {
		return nil, err
	}
	positions, err := k.client.GetPositions()
	if err != nil {
		return nil, fmt.Errorf("kite get positions: %w", err)
	}
	result := make([]BrokerPosition, 0, len(positions.Net))
	for _, position := range positions.Net {
		if position.Product != kiteconnect.ProductMIS || position.Quantity == 0 {
			continue
		}
		result = append(result, BrokerPosition{
			Exchange:        position.Exchange,
			Symbol:          position.Tradingsymbol,
			InstrumentToken: position.InstrumentToken,
			Quantity:        position.Quantity,
			AveragePrice:    position.AveragePrice,
			LastPrice:       position.LastPrice,
			PnL:             position.PnL,
		})
	}
	return result, nil
}

func (k *Kite) Quote(ctx context.Context, exchange, symbol string) (float64, error) {
	if err := k.wait(ctx); err != nil {
		return 0, err
	}
	key := exchange + ":" + symbol
	quotes, err := k.client.GetQuote(key)
	if err != nil {
		return 0, fmt.Errorf("kite quote %s: %w", key, err)
	}
	quote, ok := quotes[key]
	if !ok || quote.LastPrice <= 0 {
		return 0, fmt.Errorf("kite quote %s has no valid last price", key)
	}
	return quote.LastPrice, nil
}

func mapOrder(order kiteconnect.Order) BrokerOrder {
	return BrokerOrder{
		OrderID:         order.OrderID,
		Status:          strings.ToUpper(order.Status),
		StatusMessage:   order.StatusMessage,
		Exchange:        order.Exchange,
		Symbol:          order.TradingSymbol,
		TransactionType: order.TransactionType,
		Quantity:        int(order.Quantity),
		FilledQuantity:  int(order.FilledQuantity),
		AveragePrice:    order.AveragePrice,
		Tag:             order.Tag,
		UpdatedAt:       time.Now(),
	}
}
