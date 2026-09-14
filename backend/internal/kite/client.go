package kite

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/zerodha/gokiteconnect/v4"
)

type Client struct {
	kc        *kiteconnect.Client
	mu        sync.Mutex
	rateLimit time.Duration
	lastReq   time.Time
}

func NewClient(apiKey, accessToken string) *Client {
	kc := kiteconnect.New(apiKey)
	kc.SetAccessToken(accessToken)

	return &Client{
		kc:        kc,
		rateLimit: 350 * time.Millisecond, // ~2.8 req/sec (safely under 3 req/sec limit)
	}
}

func (c *Client) waitRateLimit() {
	c.mu.Lock()
	defer c.mu.Unlock()

	elapsed := time.Since(c.lastReq)
	if elapsed < c.rateLimit {
		time.Sleep(c.rateLimit - elapsed)
	}
	c.lastReq = time.Now()
}

func (c *Client) FetchHistorical(ctx context.Context, token int, interval string, from, to time.Time, oi bool) ([]kiteconnect.HistoricalData, error) {
	c.waitRateLimit()

	candles, err := c.kc.GetHistoricalData(token, interval, from, to, false, oi)
	if err != nil {
		return nil, fmt.Errorf("kite historical api error for token %d: %w", token, err)
	}

	return candles, nil
}

func (c *Client) FetchInstruments(ctx context.Context) (kiteconnect.Instruments, error) {
	c.waitRateLimit()

	instruments, err := c.kc.GetInstruments()
	if err != nil {
		return nil, fmt.Errorf("failed to fetch instruments master: %w", err)
	}

	return instruments, nil
}

func (c *Client) FetchQuote(ctx context.Context, instruments ...string) (kiteconnect.Quote, error) {
	c.waitRateLimit()

	quotes, err := c.kc.GetQuote(instruments...)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch quotes: %w", err)
	}

	return quotes, nil
}

func (c *Client) PlaceMISMarketOrder(ctx context.Context, exchange, symbol, transactionType string, qty int, tag string) (string, error) {
	c.waitRateLimit()

	orderParams := kiteconnect.OrderParams{
		Exchange:         exchange,
		Tradingsymbol:    symbol,
		TransactionType:  transactionType,
		Quantity:         qty,
		Product:          kiteconnect.ProductMIS,
		OrderType:        kiteconnect.OrderTypeMarket,
		Validity:         kiteconnect.ValidityDay,
		MarketProtection: -1, // Unconditional immediate market execution without price protection collar
		Tag:              tag,
	}

	resp, err := c.kc.PlaceOrder("regular", orderParams)
	if err != nil {
		return "", fmt.Errorf("kite place order error for %s (%s %d): %w", symbol, transactionType, qty, err)
	}

	return resp.OrderID, nil
}

func (c *Client) FetchPositions(ctx context.Context) (kiteconnect.Positions, error) {
	c.waitRateLimit()

	positions, err := c.kc.GetPositions()
	if err != nil {
		return kiteconnect.Positions{}, fmt.Errorf("kite get positions error: %w", err)
	}

	return positions, nil
}
