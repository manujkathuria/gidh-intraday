package ordermanager

import (
	"context"
	"encoding/json"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	KeyLivePositions = "gidh:live:positions:active"
	KeyLiveOrders    = "gidh:live:orders:active"
	KeyLiveWSTokens  = "gidh:live:ws:tokens"
	KeyLiveRiskState = "gidh:live:risk"
	KeyLiveEvents    = "gidh:live:events"
)

type RedisOrderStore struct {
	client *redis.Client
}

func NewRedisOrderStore(client *redis.Client) *RedisOrderStore {
	return &RedisOrderStore{client: client}
}

func (s *RedisOrderStore) SaveActivePosition(ctx context.Context, pos *ActivePosition) error {
	if s.client == nil || pos == nil {
		return nil
	}
	pos.UpdatedAt = time.Now()
	data, err := json.Marshal(pos)
	if err != nil {
		return err
	}
	return s.client.HSet(ctx, KeyLivePositions, pos.Symbol, data).Err()
}

func (s *RedisOrderStore) GetActivePositions(ctx context.Context) (map[string]*ActivePosition, error) {
	if s.client == nil {
		return make(map[string]*ActivePosition), nil
	}
	dataMap, err := s.client.HGetAll(ctx, KeyLivePositions).Result()
	if err != nil {
		return nil, err
	}
	res := make(map[string]*ActivePosition)
	for sym, val := range dataMap {
		var pos ActivePosition
		if err := json.Unmarshal([]byte(val), &pos); err == nil {
			res[sym] = &pos
		}
	}
	return res, nil
}

func (s *RedisOrderStore) RemoveActivePosition(ctx context.Context, symbol string) error {
	if s.client == nil {
		return nil
	}
	return s.client.HDel(ctx, KeyLivePositions, symbol).Err()
}

func (s *RedisOrderStore) SaveOrder(ctx context.Context, ord *OrderRecord) error {
	if s.client == nil || ord == nil {
		return nil
	}
	ord.UpdatedAt = time.Now()
	data, err := json.Marshal(ord)
	if err != nil {
		return err
	}
	return s.client.HSet(ctx, KeyLiveOrders, ord.OrderID, data).Err()
}

func (s *RedisOrderStore) GetActiveOrders(ctx context.Context) (map[string]*OrderRecord, error) {
	if s.client == nil {
		return make(map[string]*OrderRecord), nil
	}
	dataMap, err := s.client.HGetAll(ctx, KeyLiveOrders).Result()
	if err != nil {
		return nil, err
	}
	res := make(map[string]*OrderRecord)
	for id, val := range dataMap {
		var ord OrderRecord
		if err := json.Unmarshal([]byte(val), &ord); err == nil {
			res[id] = &ord
		}
	}
	return res, nil
}

func (s *RedisOrderStore) AddWSToken(ctx context.Context, token uint32) error {
	if s.client == nil {
		return nil
	}
	return s.client.SAdd(ctx, KeyLiveWSTokens, strconv.FormatUint(uint64(token), 10)).Err()
}

func (s *RedisOrderStore) RemoveWSToken(ctx context.Context, token uint32) error {
	if s.client == nil {
		return nil
	}
	return s.client.SRem(ctx, KeyLiveWSTokens, strconv.FormatUint(uint64(token), 10)).Err()
}

func (s *RedisOrderStore) GetWSTokens(ctx context.Context) ([]uint32, error) {
	if s.client == nil {
		return nil, nil
	}
	members, err := s.client.SMembers(ctx, KeyLiveWSTokens).Result()
	if err != nil {
		return nil, err
	}
	var tokens []uint32
	for _, m := range members {
		if t, err := strconv.ParseUint(m, 10, 32); err == nil {
			tokens = append(tokens, uint32(t))
		}
	}
	return tokens, nil
}

func (s *RedisOrderStore) SaveRiskState(ctx context.Context, risk *RiskState) error {
	if s.client == nil || risk == nil {
		return nil
	}
	data, err := json.Marshal(risk)
	if err != nil {
		return err
	}
	return s.client.Set(ctx, KeyLiveRiskState, data, 0).Err()
}

func (s *RedisOrderStore) GetRiskState(ctx context.Context) (*RiskState, error) {
	if s.client == nil {
		return nil, nil
	}
	val, err := s.client.Get(ctx, KeyLiveRiskState).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, nil
		}
		return nil, err
	}
	var risk RiskState
	if err := json.Unmarshal(val, &risk); err != nil {
		return nil, err
	}
	return &risk, nil
}

func (s *RedisOrderStore) PublishLiveEvent(ctx context.Context, eventType string, payload interface{}) error {
	if s.client == nil {
		return nil
	}
	ev := LiveEvent{
		Type:      eventType,
		Timestamp: time.Now(),
		Payload:   payload,
	}
	data, err := json.Marshal(ev)
	if err != nil {
		return err
	}
	return s.client.Publish(ctx, KeyLiveEvents, data).Err()
}
