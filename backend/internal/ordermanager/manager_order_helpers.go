package ordermanager

import (
	"context"
	"fmt"
	"math"
	"strings"
	"time"
)

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

	activeSymbols := make(map[string]struct{})
	for _, position := range positions {
		activeSymbols[position.Symbol] = struct{}{}
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
