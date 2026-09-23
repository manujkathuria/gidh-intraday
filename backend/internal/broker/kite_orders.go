package broker

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/zerodha/gokiteconnect/v4"
)

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
