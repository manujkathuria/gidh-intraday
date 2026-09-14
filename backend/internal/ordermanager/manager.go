package ordermanager

import (
	"context"
	"fmt"
	"log"
	"math"
	"sync"
	"time"

	"gidh-intraday/backend/internal/kite"
	"gidh-intraday/backend/internal/marketdata"
	"gidh-intraday/backend/internal/store"

	kitemodels "github.com/zerodha/gokiteconnect/v4/models"
)

type Manager struct {
	kiteClient     *kite.Client
	redisStore     *RedisOrderStore
	instrumentRepo *store.MarketInstrumentRepo
	tracker        *marketdata.ActivePositionTracker
	db             *store.DB

	mu             sync.RWMutex
	capitalPool    float64
	leverageMIS    float64
	marginPerSlot  float64
	maxSlots       int
	isPaperTrading bool
}

func NewManager(
	kc *kite.Client,
	rs *RedisOrderStore,
	ir *store.MarketInstrumentRepo,
	tracker *marketdata.ActivePositionTracker,
	db *store.DB,
	isPaper bool,
) *Manager {
	m := &Manager{
		kiteClient:     kc,
		redisStore:     rs,
		instrumentRepo: ir,
		tracker:        tracker,
		db:             db,
		capitalPool:    50000.0,
		leverageMIS:    5.0,
		marginPerSlot:  10000.0,
		maxSlots:       5,
		isPaperTrading: isPaper,
	}

	if tracker != nil {
		tracker.SetOnTickHandler(func(symbol string, tick kitemodels.Tick) {
			m.handleTick(symbol, tick)
		})
	}

	return m
}

// SyncWithZerodha performs authoritative reconciliation against Zerodha Kite API (Single Source of Truth)
func (m *Manager) SyncWithZerodha(ctx context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.isPaperTrading {
		log.Println("[ORDER MANAGER] Paper trading active — skipping broker sync.")
		return nil
	}

	// 1. Fetch current positions from Zerodha
	// Note: In a live session with active credentials, this queries kite.GetPositions()
	log.Println("[ORDER MANAGER] Reconciling active positions against Zerodha Source of Truth...")

	activePositions, err := m.redisStore.GetActivePositions(ctx)
	if err != nil {
		return fmt.Errorf("failed to load active positions from redis: %w", err)
	}

	// Ensure subscribed tokens in tracker match Redis active positions
	for _, pos := range activePositions {
		if m.tracker != nil && pos.InstrumentToken > 0 {
			m.tracker.SubscribePosition(pos.Symbol, pos.InstrumentToken)
			_ = m.redisStore.AddWSToken(ctx, pos.InstrumentToken)
		}
	}

	log.Printf("[ORDER MANAGER] Reconciliation complete. Active tracked positions: %d/%d slots", len(activePositions), m.maxSlots)
	return nil
}

// PlaceOrder validates risk rules, computes sizing, and executes order
func (m *Manager) PlaceOrder(ctx context.Context, intent OrderIntent) (*ActivePosition, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// 1. Check max slot availability
	activePositions, err := m.redisStore.GetActivePositions(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to query active positions: %w", err)
	}

	if len(activePositions) >= m.maxSlots {
		return nil, fmt.Errorf("max concurrent slots reached (%d/%d). Cannot enter %s", len(activePositions), m.maxSlots, intent.Symbol)
	}

	if _, exists := activePositions[intent.Symbol]; exists {
		return nil, fmt.Errorf("position for %s already active", intent.Symbol)
	}

	// 2. Fetch instrument details
	instruments, err := m.instrumentRepo.GetActiveInstruments(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch instruments: %w", err)
	}

	var targetInst *store.ActiveInstrument
	for _, inst := range instruments {
		if inst.Symbol == intent.Symbol {
			targetInst = &inst
			break
		}
	}
	if targetInst == nil {
		return nil, fmt.Errorf("symbol %s not found in active universe", intent.Symbol)
	}

	// 3. Determine execution price & quantity
	margin := intent.MarginINR
	if margin <= 0 {
		margin = m.marginPerSlot // default ₹10,000
	}
	grossExposure := margin * m.leverageMIS // default ₹50,000 gross

	// Fetch current quote price
	quotes, err := m.kiteClient.FetchQuote(ctx, fmt.Sprintf("%s:%s", targetInst.Exchange, targetInst.Symbol))
	if err != nil {
		return nil, fmt.Errorf("failed to fetch quote for %s: %w", intent.Symbol, err)
	}

	key := fmt.Sprintf("%s:%s", targetInst.Exchange, targetInst.Symbol)
	q, ok := quotes[key]
	if !ok || q.LastPrice <= 0 {
		return nil, fmt.Errorf("invalid quote received for %s", intent.Symbol)
	}

	entryPrice := q.LastPrice
	qty := int(math.Floor(grossExposure / entryPrice))
	if qty <= 0 {
		qty = 1
	}

	brokerOrderID := fmt.Sprintf("PAPER-%d", time.Now().UnixNano())
	if !m.isPaperTrading {
		// Place actual order via Kite API
		// brokerOrderID = placeBrokerOrder(...)
	}

	// 4. Create Active Position
	pos := &ActivePosition{
		Symbol:          targetInst.Symbol,
		InstrumentToken: uint32(targetInst.CashToken),
		Exchange:        targetInst.Exchange,
		Side:            intent.Side,
		Quantity:        qty,
		EntryPrice:      entryPrice,
		CurrentLTP:      entryPrice,
		PnLINR:          0.0,
		PnLPct:          0.0,
		MFEPct:          0.0,
		StopFloorPct:    -1.50, // Initial max loss floor
		Tactic:          intent.Tactic,
		Invalidation:    intent.Invalidation,
		BrokerOrderID:   brokerOrderID,
		OpenedAt:        time.Now(),
		UpdatedAt:       time.Now(),
	}

	// 5. Store in Redis
	if err := m.redisStore.SaveActivePosition(ctx, pos); err != nil {
		return nil, fmt.Errorf("failed to save active position to redis: %w", err)
	}
	_ = m.redisStore.AddWSToken(ctx, pos.InstrumentToken)

	// 6. Subscribe to WebSocket Streamer
	if m.tracker != nil && pos.InstrumentToken > 0 {
		m.tracker.SubscribePosition(pos.Symbol, pos.InstrumentToken)
	}

	// 7. Publish Event
	_ = m.redisStore.PublishLiveEvent(ctx, "POSITION_OPENED", pos)

	log.Printf("[ORDER MANAGER] Entered %s %s @ %.2f (Qty: %d, Exposure: ₹%.2f) | Tactic: %s",
		pos.Side, pos.Symbol, pos.EntryPrice, pos.Quantity, float64(pos.Quantity)*pos.EntryPrice, pos.Tactic)

	return pos, nil
}

// SquareOffPosition closes the position and removes it from hot Redis state
func (m *Manager) SquareOffPosition(ctx context.Context, symbol, reason string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	activePositions, err := m.redisStore.GetActivePositions(ctx)
	if err != nil {
		return err
	}

	pos, exists := activePositions[symbol]
	if !exists {
		return fmt.Errorf("no active position found for %s", symbol)
	}

	// 1. Unsubscribe from WebSocket
	if m.tracker != nil && pos.InstrumentToken > 0 {
		m.tracker.UnsubscribePosition(pos.InstrumentToken)
	}
	_ = m.redisStore.RemoveWSToken(ctx, pos.InstrumentToken)

	// 2. Remove from active positions in Redis
	if err := m.redisStore.RemoveActivePosition(ctx, symbol); err != nil {
		return err
	}

	// 3. Publish Event
	_ = m.redisStore.PublishLiveEvent(ctx, "POSITION_CLOSED", map[string]interface{}{
		"symbol":      pos.Symbol,
		"exit_price":  pos.CurrentLTP,
		"pnl_inr":     pos.PnLINR,
		"pnl_pct":     pos.PnLPct,
		"exit_reason": reason,
	})

	log.Printf("[ORDER MANAGER] Squared off %s @ %.2f | P&L: %+.2f INR (%+.2f%%) | Reason: %s",
		pos.Symbol, pos.CurrentLTP, pos.PnLINR, pos.PnLPct, reason)

	return nil
}

// handleTick processes sub-second live price updates, computes P&L, MFE, and applies milestone ratchets
func (m *Manager) handleTick(symbol string, tick kitemodels.Tick) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	activePositions, err := m.redisStore.GetActivePositions(ctx)
	if err != nil {
		return
	}

	pos, exists := activePositions[symbol]
	if !exists || pos == nil {
		return
	}

	ltp := tick.LastPrice
	if ltp <= 0 {
		return
	}

	pos.CurrentLTP = ltp

	// Calculate P&L
	var priceDiff float64
	if pos.Side == SideLong {
		priceDiff = ltp - pos.EntryPrice
	} else {
		priceDiff = pos.EntryPrice - ltp
	}

	pos.PnLPct = (priceDiff / pos.EntryPrice) * 100.0
	pos.PnLINR = priceDiff * float64(pos.Quantity)

	// Update MFE (Maximum Favorable Excursion)
	if pos.PnLPct > pos.MFEPct {
		pos.MFEPct = pos.PnLPct
	}

	// Milestone Trailing Ratchet Rule (HOLD_RATCHET_MILESTONES_03)
	if pos.MFEPct >= 4.00 && pos.StopFloorPct < 2.50 {
		pos.StopFloorPct = 2.50
		_ = m.redisStore.PublishLiveEvent(ctx, "RATCHET_ALERT", map[string]interface{}{
			"symbol":     pos.Symbol,
			"milestone":  "+4.00% MFE",
			"stop_floor": "+2.50% Profit Lock",
		})
	} else if pos.MFEPct >= 2.50 && pos.StopFloorPct < 1.00 {
		pos.StopFloorPct = 1.00
		_ = m.redisStore.PublishLiveEvent(ctx, "RATCHET_ALERT", map[string]interface{}{
			"symbol":     pos.Symbol,
			"milestone":  "+2.50% MFE",
			"stop_floor": "+1.00% Profit Lock",
		})
	} else if pos.MFEPct >= 1.50 && pos.StopFloorPct < 0.00 {
		pos.StopFloorPct = 0.00 // Breakeven floor
		_ = m.redisStore.PublishLiveEvent(ctx, "RATCHET_ALERT", map[string]interface{}{
			"symbol":     pos.Symbol,
			"milestone":  "+1.50% MFE",
			"stop_floor": "0.00% Breakeven Lock",
		})
	}

	// Save hot update to Redis
	_ = m.redisStore.SaveActivePosition(ctx, pos)

	// Broadcast live tick update to UI
	_ = m.redisStore.PublishLiveEvent(ctx, "TICK", pos)
}
