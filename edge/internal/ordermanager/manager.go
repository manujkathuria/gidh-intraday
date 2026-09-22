package ordermanager

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"math"
	"strings"
	"sync"
	"time"

	"gidh-intraday/edge/internal/broker"
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

func (m *Manager) RiskState(ctx context.Context) (*RiskState, error) {
	return m.store.RiskState(ctx)
}

func (m *Manager) UpdatePositionLevels(ctx context.Context, symbol string, stopLossPrice, targetPrice *float64) (*ActivePosition, error) {
	symbol = normalizeSymbol(symbol)
	position, err := m.store.GetPosition(ctx, symbol)
	if err != nil {
		return nil, fmt.Errorf("active position for %s not found: %w", symbol, err)
	}
	if stopLossPrice != nil {
		if *stopLossPrice <= 0 {
			position.StopLossPrice = 0
		} else {
			position.StopLossPrice = roundPrice(*stopLossPrice)
		}
	}
	if targetPrice != nil {
		if *targetPrice <= 0 {
			position.TargetPrice = 0
		} else {
			position.TargetPrice = roundPrice(*targetPrice)
		}
	}
	position.UpdatedAt = time.Now()
	if err := m.store.SavePosition(ctx, position, "POSITION_UPDATED"); err != nil {
		return nil, fmt.Errorf("save updated position: %w", err)
	}
	return position, nil
}

func (m *Manager) ResetTripwire(ctx context.Context) error {
	m.tripMu.Lock()
	m.orderTimes = nil
	m.tripMu.Unlock()
	log.Println("[ORDER MANAGER] Tripwire fuse manually reset. Order execution re-enabled.")
	if m.store != nil {
		return m.store.SetRiskState(ctx, &RiskState{
			KillSwitch:    false,
			CircuitBroken: false,
			Reason:        "",
		})
	}
	return nil
}

func (m *Manager) checkAndTripwire(ctx context.Context) error {
	now := time.Now()
	cutoff := now.Add(-3 * time.Second)

	m.tripMu.Lock()
	defer m.tripMu.Unlock()

	valid := make([]time.Time, 0, len(m.orderTimes))
	for _, t := range m.orderTimes {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}

	// Tripwire Fuse Rule: Disable order manager if there are more than 5 orders within 3 seconds
	if len(valid) >= 5 {
		m.orderTimes = valid
		reason := "TRIPWIRE FUSE TRIPPED: Rate limit exceeded (>5 orders placed within 3 seconds). Order manager disabled for safety."
		log.Printf("[TRIPWIRE FUSE ALERT] 🚨 %s", reason)
		if m.store != nil {
			_ = m.store.SetRiskState(ctx, &RiskState{
				KillSwitch:    true,
				CircuitBroken: true,
				Reason:        reason,
			})
		}
		return fmt.Errorf("%s", reason)
	}

	valid = append(valid, now)
	m.orderTimes = valid
	return nil
}

func (m *Manager) validateBase(ctx context.Context, input PlaceMarketInput) (Instrument, error) {
	input.Symbol = strings.ToUpper(strings.TrimSpace(input.Symbol))
	if input.ClientOrderID == "" || input.Symbol == "" || input.MarginINR <= 0 || input.Invalidation == "" {
		return Instrument{}, fmt.Errorf("clientOrderId, symbol, positive marginInr, and invalidation are required")
	}
	if input.Side != SideLong && input.Side != SideShort {
		return Instrument{}, fmt.Errorf("side must be LONG or SHORT")
	}
	risk, err := m.store.RiskState(ctx)
	if err != nil {
		return Instrument{}, fmt.Errorf("read risk state: %w", err)
	}
	if risk.KillSwitch || risk.CircuitBroken {
		return Instrument{}, fmt.Errorf("order kill switch is active: %s", risk.Reason)
	}
	if err := m.checkAndTripwire(ctx); err != nil {
		return Instrument{}, err
	}
	if m.config.LiveExecution && !withinMarketSession(time.Now()) {
		return Instrument{}, fmt.Errorf("live orders are allowed only during the NSE cash session")
	}
	instrument, err := m.instruments.Resolve(ctx, input.Symbol)
	if err != nil {
		return Instrument{}, err
	}
	positions, err := m.store.ListPositions(ctx)
	if err != nil {
		return Instrument{}, err
	}
	orders, err := m.store.ListOrders(ctx)
	if err != nil {
		return Instrument{}, err
	}
	// Count distinct active symbols across positions and pending orders
	activeSymbols := make(map[string]struct{})
	for _, position := range positions {
		activeSymbols[position.Symbol] = struct{}{}
		// If position already exists, prevent conflicting opposite side entry without square-off
		if position.Symbol == instrument.Symbol && position.Side != input.Side {
			return Instrument{}, fmt.Errorf("position for %s is currently %s; square off before reversing direction", instrument.Symbol, position.Side)
		}
	}
	for _, order := range orders {
		if order.IsExit || terminal(order.Status) {
			continue
		}
		activeSymbols[order.Symbol] = struct{}{}
	}
	// If this is a new symbol, ensure we have slot capacity
	if _, exists := activeSymbols[instrument.Symbol]; !exists {
		if len(activeSymbols) >= m.config.MaxSlots {
			return Instrument{}, fmt.Errorf("max concurrent symbol slots reached (%d/%d)", len(activeSymbols), m.config.MaxSlots)
		}
	}
	return instrument, nil
}

func (m *Manager) referencePrice(ctx context.Context, instrument Instrument) (float64, error) {
	if tick, ok := m.latestTick(instrument.Token); ok && time.Since(tick.at) <= 5*time.Second {
		return tick.price, nil
	}
	if m.config.LiveExecution {
		return m.broker.Quote(ctx, instrument.Exchange, instrument.Symbol)
	}
	return m.instruments.LatestPrice(ctx, instrument.Symbol)
}

func (m *Manager) latestTick(token uint32) (tickValue, bool) {
	m.latestMu.RLock()
	defer m.latestMu.RUnlock()
	tick, ok := m.latestTicks[token]
	return tick, ok
}

func (m *Manager) newOrder(input PlaceMarketInput, instrument Instrument, orderType ManagedOrderType, referencePrice, limitPrice float64) *ManagedOrder {
	qtyPrice := referencePrice
	if limitPrice > 0 {
		qtyPrice = limitPrice
	}
	quantity := int(math.Floor(input.MarginINR * m.config.Leverage / qtyPrice))
	if quantity < 1 {
		quantity = 1
	}
	id := newID("ord")
	var stop, target float64
	// AI tactics attach automated MAE / 2R levels; manual / chart orders remain open-ended
	if input.Tactic == "QUANT_BRAIN" || input.Tactic == "AUTO_AI" || input.Tactic == "MACRO_AI" {
		stop, target = fixedLevels(input.Side, qtyPrice)
		stop, target = roundPrice(stop), roundPrice(target)
	}
	return &ManagedOrder{
		ID: id, ClientOrderID: input.ClientOrderID, BrokerTag: brokerTag(id),
		OrderType: orderType, Symbol: instrument.Symbol, InstrumentToken: instrument.Token,
		Exchange: instrument.Exchange, Side: input.Side, Quantity: quantity,
		MarginINR: input.MarginINR, LimitPrice: limitPrice, ReferencePrice: referencePrice,
		ExpectedStopPrice: stop, ExpectedTargetPrice: target,
		Tactic: input.Tactic, Invalidation: input.Invalidation, InitiatedBy: input.InitiatedBy,
		Revision: 1, CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}
}

func (m *Manager) createIdempotent(ctx context.Context, order *ManagedOrder) (*ManagedOrder, bool, error) {
	existing, created, err := m.store.CreateOrder(ctx, order)
	if err != nil {
		return nil, false, err
	}
	if !created {
		if err := sameIntent(existing, order); err != nil {
			return nil, false, err
		}
		return existing, false, nil
	}
	return order, true, nil
}

func withinMarketSession(now time.Time) bool {
	loc, err := time.LoadLocation("Asia/Kolkata")
	if err == nil {
		now = now.In(loc)
	}
	if now.Weekday() == time.Saturday || now.Weekday() == time.Sunday {
		return false
	}
	minutes := now.Hour()*60 + now.Minute()
	return minutes >= 9*60+15 && minutes <= 15*60+30
}

func terminal(status ManagedOrderStatus) bool {
	return status == StatusFilled || status == StatusRejected || status == StatusCancelled || status == StatusClosed
}

func transactionType(side TradeSide) string {
	if side == SideShort {
		return "SELL"
	}
	return "BUY"
}

func newID(prefix string) string {
	buf := make([]byte, 12)
	if _, err := rand.Read(buf); err != nil {
		return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
	}
	return prefix + "-" + hex.EncodeToString(buf)
}

func brokerTag(id string) string {
	compact := strings.ReplaceAll(id, "-", "")
	if len(compact) > 16 {
		compact = compact[len(compact)-16:]
	}
	return "GIDH" + compact
}

func roundPrice(price float64) float64 { return math.Round(price*100) / 100 }
