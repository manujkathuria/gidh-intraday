package ordermanager

import (
	"context"
	"encoding/json"
	"sort"
	"time"

	"github.com/redis/go-redis/v9"
)

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
