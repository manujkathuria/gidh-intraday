package ordermanager

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"gidh-intraday/backend/internal/broker"
)

type Config struct {
	Leverage          float64
	MaxSlots          int
	LiveExecution     bool
	ReconcileInterval time.Duration
}

type Manager struct {
	broker      broker.Broker
	store       *Store
	instruments InstrumentRepository
	config      Config
	index       *subscriptionIndex
	mu          sync.Mutex
	latestMu    sync.RWMutex
	latestTicks map[uint32]tickValue
	lastPersist map[string]time.Time
	tripMu      sync.Mutex
	orderTimes  []time.Time
}

type tickValue struct {
	price float64
	at    time.Time
}

func NewManager(b broker.Broker, store *Store, instruments InstrumentRepository, subscriber TokenSubscriber, config Config) *Manager {
	if config.Leverage <= 0 {
		config.Leverage = 5
	}
	if config.MaxSlots <= 0 {
		config.MaxSlots = 5
	}
	if config.ReconcileInterval <= 0 {
		config.ReconcileInterval = 15 * time.Second
	}
	return &Manager{
		broker: b, store: store, instruments: instruments, config: config,
		index:       newSubscriptionIndex(store, subscriber),
		latestTicks: make(map[uint32]tickValue), lastPersist: make(map[string]time.Time),
	}
}

func (m *Manager) Start(ctx context.Context) error {
	if err := m.store.MigrateLegacyState(ctx); err != nil {
		return fmt.Errorf("migrate legacy order state: %w", err)
	}
	orders, err := m.store.ListOrders(ctx)
	if err != nil {
		return fmt.Errorf("load managed orders: %w", err)
	}
	positions, err := m.store.ListPositions(ctx)
	if err != nil {
		return fmt.Errorf("load active positions: %w", err)
	}
	if err := m.index.rebuild(ctx, orders, positions); err != nil {
		return fmt.Errorf("restore order subscriptions: %w", err)
	}
	if err := m.Reconcile(ctx); err != nil {
		log.Printf("[ORDER MANAGER] startup reconciliation pending: %v", err)
	}
	go m.reconcileLoop(ctx)
	return nil
}

func (m *Manager) ListPositions(ctx context.Context) ([]*ActivePosition, error) {
	return m.store.ListPositions(ctx)
}

func (m *Manager) ListOrders(ctx context.Context) ([]*ManagedOrder, error) {
	return m.store.ListOrders(ctx)
}

func (m *Manager) ListClosedPositions(ctx context.Context, date string) ([]*ClosedPosition, error) {
	return m.store.ListClosedPositions(ctx, date)
}
