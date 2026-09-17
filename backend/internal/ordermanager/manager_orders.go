package ordermanager

import (
	"context"
	"fmt"
	"log"
	"math"
	"time"

	"gidh-intraday/backend/internal/store"
)

// PlaceOrder validates risk rules, computes sizing, and executes order
func (m *Manager) PlaceOrder(ctx context.Context, intent OrderIntent) (*ActivePosition, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

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

	margin := intent.MarginINR
	if margin <= 0 {
		margin = m.marginPerSlot
	}
	grossExposure := margin * m.leverageMIS

	var entryPrice float64
	if m.kiteClient != nil {
		quotes, err := m.kiteClient.FetchQuote(ctx, fmt.Sprintf("%s:%s", targetInst.Exchange, targetInst.Symbol))
		if err != nil {
			return nil, fmt.Errorf("failed to fetch quote for %s: %w", intent.Symbol, err)
		}
		key := fmt.Sprintf("%s:%s", targetInst.Exchange, targetInst.Symbol)
		q, ok := quotes[key]
		if !ok || q.LastPrice <= 0 {
			return nil, fmt.Errorf("invalid quote received for %s", intent.Symbol)
		}
		entryPrice = q.LastPrice
	} else if m.tracker != nil {
		if tick, ok := m.tracker.GetLatestTick(targetInst.Symbol); ok && tick.LastPrice > 0 {
			entryPrice = tick.LastPrice
		}
	}

	if entryPrice <= 0 {
		entryPrice = 1000.0
	}

	qty := int(math.Floor(grossExposure / entryPrice))
	if qty <= 0 {
		qty = 1
	}

	var side PositionSide
	var txnType string

	switch intent.Side {
	case SideLong, "BUY":
		side = SideLong
		txnType = "BUY"
	case SideShort, "SELL":
		side = SideShort
		txnType = "SELL"
	default:
		return nil, fmt.Errorf("invalid order side '%s': must be LONG/BUY or SHORT/SELL", intent.Side)
	}

	brokerOrderID := fmt.Sprintf("PAPER-%d", time.Now().UnixNano())
	if !m.isPaperTrading && m.kiteClient != nil {
		placedID, err := m.kiteClient.PlaceMISMarketOrder(ctx, targetInst.Exchange, targetInst.Symbol, txnType, qty, "GIDH")
		if err != nil {
			return nil, fmt.Errorf("zerodha order placement failed for %s: %w", targetInst.Symbol, err)
		}
		brokerOrderID = placedID
		log.Printf("[ORDER MANAGER] Placed Zerodha MIS Market Order (%s %s %d) | OrderID: %s", txnType, targetInst.Symbol, qty, brokerOrderID)
	}

	pos := &ActivePosition{
		Symbol:          targetInst.Symbol,
		InstrumentToken: uint32(targetInst.CashToken),
		Exchange:        targetInst.Exchange,
		Side:            side,
		Quantity:        qty,
		EntryPrice:      entryPrice,
		CurrentLTP:      entryPrice,
		StopFloorPct:    -1.00,
		Tactic:          intent.Tactic,
		Invalidation:    intent.Invalidation,
		BrokerOrderID:   brokerOrderID,
		OpenedAt:        time.Now(),
		UpdatedAt:       time.Now(),
	}

	if err := m.redisStore.SaveActivePosition(ctx, pos); err != nil {
		return nil, fmt.Errorf("failed to save active position to redis: %w", err)
	}
	_ = m.redisStore.AddWSToken(ctx, pos.InstrumentToken)

	if m.tracker != nil && pos.InstrumentToken > 0 {
		m.tracker.SubscribePosition(pos.Symbol, pos.InstrumentToken)
	}

	_ = m.redisStore.PublishLiveEvent(ctx, "ORDER_FILLED", pos)
	log.Printf("[ORDER MANAGER] Successfully opened %s position for %s (Qty: %d @ %.2f) | OrderID: %s",
		pos.Side, pos.Symbol, pos.Quantity, pos.EntryPrice, pos.BrokerOrderID)

	return pos, nil
}

// PlaceVirtualBracketOrder registers an internal virtual bracket with passive entry, 1.0% MAE stop, and 2.0R target
func (m *Manager) PlaceVirtualBracketOrder(ctx context.Context, intent OrderIntent) (*VirtualBracketOrder, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

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

	margin := intent.MarginINR
	if margin <= 0 {
		margin = m.marginPerSlot
	}
	grossExposure := margin * m.leverageMIS

	entryPrice := intent.TargetEntryPrice
	if entryPrice <= 0 {
		entryPrice = 1000.0
	}

	qty := int(math.Floor(grossExposure / entryPrice))
	if qty <= 0 {
		qty = 1
	}

	vbo := &VirtualBracketOrder{
		ID:               fmt.Sprintf("VBO-%s-%d", intent.Symbol, time.Now().Unix()),
		Symbol:           targetInst.Symbol,
		Exchange:         targetInst.Exchange,
		InstrumentToken:  uint32(targetInst.CashToken),
		Side:             intent.Side,
		Status:           StatusPendingEntry,
		TargetEntryPrice: intent.TargetEntryPrice,
		StopLossPrice:    intent.StopLossPrice,
		TargetPrice:      intent.TargetPrice,
		Quantity:         qty,
		MarginINR:        margin,
		CurrentLTP:       entryPrice,
		CreatedAt:        time.Now(),
	}

	if err := m.redisStore.SaveVirtualBracketOrder(ctx, vbo); err != nil {
		return nil, fmt.Errorf("failed to save virtual bracket to redis: %w", err)
	}
	_ = m.redisStore.AddWSToken(ctx, vbo.InstrumentToken)

	if m.tracker != nil && vbo.InstrumentToken > 0 {
		m.tracker.SubscribePosition(vbo.Symbol, vbo.InstrumentToken)
	}

	_ = m.redisStore.PublishLiveEvent(ctx, "VBO_REGISTERED", vbo)
	log.Printf("[VIRTUAL ENGINE] Registered %s %s | Limit: %.2f | Stop(1%%): %.2f | Target(2R): %.2f | Qty: %d",
		vbo.Side, vbo.Symbol, vbo.TargetEntryPrice, vbo.StopLossPrice, vbo.TargetPrice, vbo.Quantity)

	return vbo, nil
}
