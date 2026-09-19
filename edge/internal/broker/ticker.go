package broker

import (
	"context"
	"log"
	"sort"
	"sync"
	"time"

	kitemodels "github.com/zerodha/gokiteconnect/v4/models"
	kiteticker "github.com/zerodha/gokiteconnect/v4/ticker"
)

type TickHandler func(token uint32, ltp float64, at time.Time)

type SelectiveTicker struct {
	ticker    *kiteticker.Ticker
	mu        sync.Mutex
	opMu      sync.Mutex
	tokens    map[uint32]struct{}
	connected bool
	handler   TickHandler
}

func NewSelectiveTicker(apiKey, accessToken string) *SelectiveTicker {
	return &SelectiveTicker{
		ticker: kiteticker.New(apiKey, accessToken),
		tokens: make(map[uint32]struct{}),
	}
}

func (s *SelectiveTicker) Start(ctx context.Context, handler TickHandler) {
	s.mu.Lock()
	s.handler = handler
	s.mu.Unlock()

	s.ticker.OnConnect(func() {
		s.mu.Lock()
		s.connected = true
		tokens := s.tokenSliceLocked()
		s.mu.Unlock()
		if len(tokens) > 0 {
			s.opMu.Lock()
			defer s.opMu.Unlock()
			_ = s.ticker.Subscribe(tokens)
			_ = s.ticker.SetMode(kiteticker.ModeLTP, tokens)
		}
		log.Printf("[ORDER TICKER] connected with %d interested tokens", len(tokens))
	})
	s.ticker.OnTick(func(tick kitemodels.Tick) {
		s.mu.Lock()
		handler := s.handler
		s.mu.Unlock()
		if handler == nil || tick.LastPrice <= 0 {
			return
		}
		at := time.Now()
		if !tick.Timestamp.Time.IsZero() {
			at = tick.Timestamp.Time
		}
		handler(tick.InstrumentToken, tick.LastPrice, at)
	})
	s.ticker.OnError(func(err error) { log.Printf("[ORDER TICKER] error: %v", err) })
	s.ticker.OnClose(func(code int, reason string) {
		s.mu.Lock()
		s.connected = false
		s.mu.Unlock()
		log.Printf("[ORDER TICKER] closed code=%d reason=%s", code, reason)
	})
	go func() {
		go s.ticker.Serve()
		<-ctx.Done()
		s.Close()
	}()
}

func (s *SelectiveTicker) SetTokens(tokens []uint32) error {
	next := make(map[uint32]struct{}, len(tokens))
	for _, token := range tokens {
		if token > 0 {
			next[token] = struct{}{}
		}
	}

	s.mu.Lock()
	var added, removed []uint32
	for token := range next {
		if _, ok := s.tokens[token]; !ok {
			added = append(added, token)
		}
	}
	for token := range s.tokens {
		if _, ok := next[token]; !ok {
			removed = append(removed, token)
		}
	}
	s.tokens = next
	connected := s.connected
	s.mu.Unlock()

	if !connected {
		return nil
	}
	s.opMu.Lock()
	defer s.opMu.Unlock()
	if len(removed) > 0 {
		if err := s.ticker.Unsubscribe(removed); err != nil {
			return err
		}
	}
	if len(added) > 0 {
		if err := s.ticker.Subscribe(added); err != nil {
			return err
		}
		return s.ticker.SetMode(kiteticker.ModeLTP, added)
	}
	return nil
}

func (s *SelectiveTicker) Close() {
	s.opMu.Lock()
	defer s.opMu.Unlock()
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.ticker != nil {
		s.ticker.Close()
	}
	s.connected = false
}

func (s *SelectiveTicker) tokenSliceLocked() []uint32 {
	tokens := make([]uint32, 0, len(s.tokens))
	for token := range s.tokens {
		tokens = append(tokens, token)
	}
	sort.Slice(tokens, func(i, j int) bool { return tokens[i] < tokens[j] })
	return tokens
}
