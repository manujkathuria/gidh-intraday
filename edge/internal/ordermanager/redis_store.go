package ordermanager

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	KeyOrders           = "gidh-intraday:live:orders"
	KeyPositions        = "gidh-intraday:live:positions"
	KeyClientOrders     = "gidh-intraday:live:client-orders"
	KeyInterestedTokens = "gidh-intraday:live:interested-tokens"
	KeyOrderEvents      = "gidh-intraday:live:order-events"
	KeyLiveEvents       = "gidh-intraday:live:events"
	KeyRiskState        = "gidh-intraday:live:risk"
	KeyPositionExits    = "gidh-intraday:live:position-exits"
	legacyPositionsKey  = "gidh-intraday:live:positions:active"
	legacyOrdersKey     = "gidh-intraday:live:orders:active"
)

var ErrTransitionConflict = errors.New("order state changed concurrently")

type Store struct {
	client *redis.Client
}

func NewStore(client *redis.Client) *Store { return &Store{client: client} }

func (s *Store) MigrateLegacyState(ctx context.Context) error {
	legacyPositions, err := s.client.HGetAll(ctx, legacyPositionsKey).Result()
	if err != nil {
		return err
	}
	for symbol, raw := range legacyPositions {
		var position ActivePosition
		if json.Unmarshal([]byte(raw), &position) != nil {
			continue
		}
		if position.Symbol == "" {
			position.Symbol = symbol
		}
		if position.UpdatedAt.IsZero() {
			position.UpdatedAt = time.Now()
		}
		data, marshalErr := json.Marshal(&position)
		if marshalErr == nil {
			_ = s.client.HSetNX(ctx, KeyPositions, position.Symbol, data).Err()
		}
	}

	legacyOrders, err := s.client.HGetAll(ctx, legacyOrdersKey).Result()
	if err != nil {
		return err
	}
	for id, raw := range legacyOrders {
		var legacy struct {
			ID               string    `json:"id"`
			Symbol           string    `json:"symbol"`
			Exchange         string    `json:"exchange"`
			InstrumentToken  uint32    `json:"instrument_token"`
			Side             TradeSide `json:"side"`
			Status           string    `json:"status"`
			TargetEntryPrice float64   `json:"target_entry_price"`
			Quantity         int       `json:"quantity"`
			MarginINR        float64   `json:"margin_inr"`
			CreatedAt        time.Time `json:"created_at"`
		}
		if json.Unmarshal([]byte(raw), &legacy) != nil || legacy.Status != "PENDING_ENTRY" {
			continue
		}
		if legacy.ID == "" {
			legacy.ID = id
		}
		if legacy.CreatedAt.IsZero() {
			legacy.CreatedAt = time.Now()
		}
		stop, target := fixedLevels(legacy.Side, legacy.TargetEntryPrice)
		order := &ManagedOrder{
			ID: legacy.ID, ClientOrderID: "legacy:" + legacy.ID,
			BrokerTag: brokerTag(legacy.ID), OrderType: OrderTypeSyntheticLimit,
			Status: StatusPending, Symbol: legacy.Symbol, Exchange: legacy.Exchange,
			InstrumentToken: legacy.InstrumentToken, Side: legacy.Side,
			Quantity: legacy.Quantity, MarginINR: legacy.MarginINR,
			LimitPrice: legacy.TargetEntryPrice, ReferencePrice: legacy.TargetEntryPrice,
			ExpectedStopPrice: roundPrice(stop), ExpectedTargetPrice: roundPrice(target),
			Invalidation: "LEGACY_MIGRATION", Revision: 1,
			CreatedAt: legacy.CreatedAt, UpdatedAt: time.Now(),
		}
		_, _, _ = s.CreateOrder(ctx, order)
	}
	return nil
}

func (s *Store) CreateOrder(ctx context.Context, order *ManagedOrder) (*ManagedOrder, bool, error) {
	data, err := json.Marshal(order)
	if err != nil {
		return nil, false, err
	}
	event, err := eventJSON("ORDER_CREATED", order)
	if err != nil {
		return nil, false, err
	}
	script := redis.NewScript(`
local existing = redis.call('HGET', KEYS[2], ARGV[1])
if existing then return existing end
redis.call('HSET', KEYS[1], ARGV[2], ARGV[3])
redis.call('HSET', KEYS[2], ARGV[1], ARGV[2])
redis.call('XADD', KEYS[3], '*', 'event', ARGV[4])
redis.call('PUBLISH', KEYS[4], ARGV[4])
return ''
`)
	result, err := script.Run(ctx, s.client, []string{KeyOrders, KeyClientOrders, KeyOrderEvents, KeyLiveEvents}, order.ClientOrderID, order.ID, data, event).Text()
	if err != nil && err != redis.Nil {
		return nil, false, err
	}
	if result != "" {
		existing, getErr := s.GetOrder(ctx, result)
		return existing, false, getErr
	}
	return order, true, nil
}

func (s *Store) GetOrder(ctx context.Context, id string) (*ManagedOrder, error) {
	value, err := s.client.HGet(ctx, KeyOrders, id).Bytes()
	if err != nil {
		return nil, err
	}
	var order ManagedOrder
	if err := json.Unmarshal(value, &order); err != nil {
		return nil, err
	}
	return &order, nil
}

func (s *Store) GetOrderByClientID(ctx context.Context, clientOrderID string) (*ManagedOrder, error) {
	id, err := s.client.HGet(ctx, KeyClientOrders, clientOrderID).Result()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return s.GetOrder(ctx, id)
}

func (s *Store) ListOrders(ctx context.Context) ([]*ManagedOrder, error) {
	values, err := s.client.HGetAll(ctx, KeyOrders).Result()
	if err != nil {
		return nil, err
	}
	orders := make([]*ManagedOrder, 0, len(values))
	for _, value := range values {
		var order ManagedOrder
		if json.Unmarshal([]byte(value), &order) == nil {
			orders = append(orders, &order)
		}
	}
	sort.Slice(orders, func(i, j int) bool { return orders[i].CreatedAt.Before(orders[j].CreatedAt) })
	return orders, nil
}

func (s *Store) Transition(ctx context.Context, current *ManagedOrder, nextStatus ManagedOrderStatus, mutate func(*ManagedOrder)) (*ManagedOrder, error) {
	next := *current
	next.Status = nextStatus
	next.Revision++
	next.UpdatedAt = time.Now()
	if mutate != nil {
		mutate(&next)
	}
	data, err := json.Marshal(&next)
	if err != nil {
		return nil, err
	}
	event, err := eventJSON("ORDER_STATUS_CHANGED", &next)
	if err != nil {
		return nil, err
	}
	script := redis.NewScript(`
local raw = redis.call('HGET', KEYS[1], ARGV[1])
if not raw then return 0 end
local current = cjson.decode(raw)
if current.status ~= ARGV[2] or tonumber(current.revision) ~= tonumber(ARGV[3]) then return -1 end
redis.call('HSET', KEYS[1], ARGV[1], ARGV[4])
redis.call('XADD', KEYS[2], '*', 'event', ARGV[5])
redis.call('PUBLISH', KEYS[3], ARGV[5])
return 1
`)
	result, err := script.Run(ctx, s.client, []string{KeyOrders, KeyOrderEvents, KeyLiveEvents}, current.ID, string(current.Status), current.Revision, data, event).Int()
	if err != nil {
		return nil, err
	}
	if result != 1 {
		return nil, ErrTransitionConflict
	}
	return &next, nil
}

func (s *Store) SavePosition(ctx context.Context, position *ActivePosition, eventType string) error {
	data, err := json.Marshal(position)
	if err != nil {
		return err
	}
	event, err := eventJSON(eventType, position)
	if err != nil {
		return err
	}
	script := redis.NewScript(`
redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
redis.call('XADD', KEYS[2], '*', 'event', ARGV[3])
redis.call('PUBLISH', KEYS[3], ARGV[3])
return 1
`)
	return script.Run(ctx, s.client, []string{KeyPositions, KeyOrderEvents, KeyLiveEvents}, position.Symbol, data, event).Err()
}

func (s *Store) FillEntry(ctx context.Context, current *ManagedOrder, position *ActivePosition) (*ManagedOrder, error) {
	next := *current
	next.Status = StatusFilled
	next.Revision++
	next.ActualFillPrice = position.EntryPrice
	next.Quantity = position.Quantity
	next.StopPrice = position.StopLossPrice
	next.TargetPrice = position.TargetPrice
	next.FilledAt = &position.OpenedAt
	next.UpdatedAt = time.Now()
	orderData, err := json.Marshal(&next)
	if err != nil {
		return nil, err
	}
	positionData, err := json.Marshal(position)
	if err != nil {
		return nil, err
	}
	orderEvent, err := eventJSON("ORDER_STATUS_CHANGED", &next)
	if err != nil {
		return nil, err
	}
	positionEvent, err := eventJSON("POSITION_OPENED", position)
	if err != nil {
		return nil, err
	}
	script := redis.NewScript(`
local raw = redis.call('HGET', KEYS[1], ARGV[1])
if not raw then return 0 end
local current = cjson.decode(raw)
if current.status ~= ARGV[2] or tonumber(current.revision) ~= tonumber(ARGV[3]) then return -1 end
redis.call('HSET', KEYS[1], ARGV[1], ARGV[4])
redis.call('HSET', KEYS[2], ARGV[5], ARGV[6])
redis.call('XADD', KEYS[3], '*', 'event', ARGV[7])
redis.call('XADD', KEYS[3], '*', 'event', ARGV[8])
redis.call('PUBLISH', KEYS[4], ARGV[7])
redis.call('PUBLISH', KEYS[4], ARGV[8])
return 1
`)
	result, err := script.Run(ctx, s.client,
		[]string{KeyOrders, KeyPositions, KeyOrderEvents, KeyLiveEvents},
		current.ID, string(current.Status), current.Revision, orderData,
		position.Symbol, positionData, orderEvent, positionEvent,
	).Int()
	if err != nil {
		return nil, err
	}
	if result != 1 {
		return nil, ErrTransitionConflict
	}
	return &next, nil
}

func (s *Store) GetPosition(ctx context.Context, symbol string) (*ActivePosition, error) {
	data, err := s.client.HGet(ctx, KeyPositions, symbol).Bytes()
	if err != nil {
		return nil, err
	}
	var position ActivePosition
	if err := json.Unmarshal(data, &position); err != nil {
		return nil, err
	}
	return &position, nil
}

func (s *Store) ListPositions(ctx context.Context) ([]*ActivePosition, error) {
	values, err := s.client.HGetAll(ctx, KeyPositions).Result()
	if err != nil {
		return nil, err
	}
	positions := make([]*ActivePosition, 0, len(values))
	for _, value := range values {
		var position ActivePosition
		if json.Unmarshal([]byte(value), &position) == nil {
			positions = append(positions, &position)
		}
	}
	sort.Slice(positions, func(i, j int) bool { return positions[i].Symbol < positions[j].Symbol })
	return positions, nil
}

func (s *Store) RemovePosition(ctx context.Context, symbol string, payload any) error {
	event, err := eventJSON("POSITION_CLOSED", payload)
	if err != nil {
		return err
	}
	script := redis.NewScript(`
redis.call('HDEL', KEYS[1], ARGV[1])
redis.call('HDEL', KEYS[2], ARGV[1])
redis.call('XADD', KEYS[3], '*', 'event', ARGV[2])
redis.call('PUBLISH', KEYS[4], ARGV[2])
return 1
`)
	return script.Run(ctx, s.client, []string{KeyPositions, KeyPositionExits, KeyOrderEvents, KeyLiveEvents}, symbol, event).Err()
}

func (s *Store) ClosePosition(ctx context.Context, current *ManagedOrder, position *ActivePosition, fillPrice float64, payload any) (*ManagedOrder, error) {
	next := *current
	now := time.Now()
	next.Status = StatusClosed
	next.Revision++
	next.ActualFillPrice = fillPrice
	next.FilledAt = &now
	next.UpdatedAt = now
	orderData, err := json.Marshal(&next)
	if err != nil {
		return nil, err
	}
	orderEvent, err := eventJSON("ORDER_STATUS_CHANGED", &next)
	if err != nil {
		return nil, err
	}
	positionEvent, err := eventJSON("POSITION_CLOSED", payload)
	if err != nil {
		return nil, err
	}
	script := redis.NewScript(`
local raw = redis.call('HGET', KEYS[1], ARGV[1])
if not raw then return 0 end
local current = cjson.decode(raw)
if current.status ~= ARGV[2] or tonumber(current.revision) ~= tonumber(ARGV[3]) then return -1 end
redis.call('HSET', KEYS[1], ARGV[1], ARGV[4])
redis.call('HDEL', KEYS[2], ARGV[5])
redis.call('HDEL', KEYS[3], ARGV[5])
redis.call('XADD', KEYS[4], '*', 'event', ARGV[6])
redis.call('XADD', KEYS[4], '*', 'event', ARGV[7])
redis.call('PUBLISH', KEYS[5], ARGV[6])
redis.call('PUBLISH', KEYS[5], ARGV[7])
return 1
`)
	result, err := script.Run(ctx, s.client,
		[]string{KeyOrders, KeyPositions, KeyPositionExits, KeyOrderEvents, KeyLiveEvents},
		current.ID, string(current.Status), current.Revision, orderData, position.Symbol, orderEvent, positionEvent,
	).Int()
	if err != nil {
		return nil, err
	}
	if result != 1 {
		return nil, ErrTransitionConflict
	}
	return &next, nil
}

func (s *Store) ClaimPositionExit(ctx context.Context, symbol, orderID string) (bool, error) {
	return s.client.HSetNX(ctx, KeyPositionExits, symbol, orderID).Result()
}

func (s *Store) ReleasePositionExit(ctx context.Context, symbol string) error {
	return s.client.HDel(ctx, KeyPositionExits, symbol).Err()
}

func (s *Store) SetInterestedTokens(ctx context.Context, tokens []uint32) error {
	values := make([]interface{}, 0, len(tokens))
	for _, token := range tokens {
		values = append(values, token)
	}
	pipe := s.client.TxPipeline()
	pipe.Del(ctx, KeyInterestedTokens)
	if len(values) > 0 {
		pipe.SAdd(ctx, KeyInterestedTokens, values...)
	}
	_, err := pipe.Exec(ctx)
	return err
}

func (s *Store) RiskState(ctx context.Context) (*RiskState, error) {
	data, err := s.client.Get(ctx, KeyRiskState).Bytes()
	if err == redis.Nil {
		return &RiskState{}, nil
	}
	if err != nil {
		return nil, err
	}
	var state RiskState
	if err := json.Unmarshal(data, &state); err != nil {
		return nil, err
	}
	return &state, nil
}

func (s *Store) PublishEvent(ctx context.Context, eventType string, payload any) error {
	event, err := eventJSON(eventType, payload)
	if err != nil {
		return err
	}
	pipe := s.client.Pipeline()
	pipe.XAdd(ctx, &redis.XAddArgs{Stream: KeyOrderEvents, Values: map[string]interface{}{"event": event}})
	pipe.Publish(ctx, KeyLiveEvents, event)
	_, err = pipe.Exec(ctx)
	return err
}

func eventJSON(eventType string, payload any) ([]byte, error) {
	return json.Marshal(map[string]any{
		"type":      eventType,
		"timestamp": time.Now(),
		"payload":   payload,
	})
}

func sameIntent(existing *ManagedOrder, order *ManagedOrder) error {
	if existing.Symbol != order.Symbol || existing.Side != order.Side || existing.OrderType != order.OrderType || existing.MarginINR != order.MarginINR || existing.LimitPrice != order.LimitPrice {
		return fmt.Errorf("client order id %s was already used with a different payload", order.ClientOrderID)
	}
	return nil
}
