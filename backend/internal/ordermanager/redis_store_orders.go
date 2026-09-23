package ordermanager

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"time"

	"github.com/redis/go-redis/v9"
)

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

func sameIntent(existing *ManagedOrder, order *ManagedOrder) error {
	if existing.Symbol != order.Symbol || existing.Side != order.Side || existing.OrderType != order.OrderType || existing.MarginINR != order.MarginINR || existing.LimitPrice != order.LimitPrice {
		return fmt.Errorf("client order id %s was already used with a different payload", order.ClientOrderID)
	}
	return nil
}
