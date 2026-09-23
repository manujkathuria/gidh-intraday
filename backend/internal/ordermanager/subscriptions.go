package ordermanager

import (
	"context"
	"sort"
	"sync"
)

type TokenSubscriber interface {
	SetTokens([]uint32) error
}

type subscriptionIndex struct {
	mu              sync.RWMutex
	pendingByToken  map[uint32]map[string]struct{}
	positionByToken map[uint32]string
	subscriber      TokenSubscriber
	store           *Store
}

func newSubscriptionIndex(store *Store, subscriber TokenSubscriber) *subscriptionIndex {
	return &subscriptionIndex{
		pendingByToken:  make(map[uint32]map[string]struct{}),
		positionByToken: make(map[uint32]string),
		subscriber:      subscriber,
		store:           store,
	}
}

func (s *subscriptionIndex) rebuild(ctx context.Context, orders []*ManagedOrder, positions []*ActivePosition) error {
	s.mu.Lock()
	s.pendingByToken = make(map[uint32]map[string]struct{})
	s.positionByToken = make(map[uint32]string)
	for _, order := range orders {
		if order.Status == StatusPending {
			s.addPendingLocked(order.InstrumentToken, order.ID)
		}
	}
	for _, position := range positions {
		s.positionByToken[position.InstrumentToken] = position.Symbol
	}
	tokens := s.tokensLocked()
	s.mu.Unlock()
	return s.sync(ctx, tokens)
}

func (s *subscriptionIndex) addPending(ctx context.Context, token uint32, id string) error {
	s.mu.Lock()
	s.addPendingLocked(token, id)
	tokens := s.tokensLocked()
	s.mu.Unlock()
	return s.sync(ctx, tokens)
}

func (s *subscriptionIndex) removePending(ctx context.Context, token uint32, id string) error {
	s.mu.Lock()
	if ids := s.pendingByToken[token]; ids != nil {
		delete(ids, id)
		if len(ids) == 0 {
			delete(s.pendingByToken, token)
		}
	}
	tokens := s.tokensLocked()
	s.mu.Unlock()
	return s.sync(ctx, tokens)
}

func (s *subscriptionIndex) addPosition(ctx context.Context, position *ActivePosition) error {
	s.mu.Lock()
	s.positionByToken[position.InstrumentToken] = position.Symbol
	tokens := s.tokensLocked()
	s.mu.Unlock()
	return s.sync(ctx, tokens)
}

func (s *subscriptionIndex) removePosition(ctx context.Context, token uint32) error {
	s.mu.Lock()
	delete(s.positionByToken, token)
	tokens := s.tokensLocked()
	s.mu.Unlock()
	return s.sync(ctx, tokens)
}

func (s *subscriptionIndex) pendingIDs(token uint32) []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	ids := make([]string, 0, len(s.pendingByToken[token]))
	for id := range s.pendingByToken[token] {
		ids = append(ids, id)
	}
	return ids
}

func (s *subscriptionIndex) positionSymbol(token uint32) string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.positionByToken[token]
}

func (s *subscriptionIndex) addPendingLocked(token uint32, id string) {
	if token == 0 {
		return
	}
	if s.pendingByToken[token] == nil {
		s.pendingByToken[token] = make(map[string]struct{})
	}
	s.pendingByToken[token][id] = struct{}{}
}

func (s *subscriptionIndex) tokensLocked() []uint32 {
	seen := make(map[uint32]struct{}, len(s.pendingByToken)+len(s.positionByToken))
	for token := range s.pendingByToken {
		seen[token] = struct{}{}
	}
	for token := range s.positionByToken {
		seen[token] = struct{}{}
	}
	tokens := make([]uint32, 0, len(seen))
	for token := range seen {
		tokens = append(tokens, token)
	}
	sort.Slice(tokens, func(i, j int) bool { return tokens[i] < tokens[j] })
	return tokens
}

func (s *subscriptionIndex) sync(ctx context.Context, tokens []uint32) error {
	if err := s.store.SetInterestedTokens(ctx, tokens); err != nil {
		return err
	}
	if s.subscriber != nil {
		return s.subscriber.SetTokens(tokens)
	}
	return nil
}
