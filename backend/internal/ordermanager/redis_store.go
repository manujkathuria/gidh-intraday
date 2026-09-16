package ordermanager

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	KeyLivePositions = "gidh-intraday:live:positions:active"
	KeyLiveOrders    = "gidh-intraday:live:orders:active"
	KeyLiveWSTokens  = "gidh-intraday:live:ws:tokens"
	KeyLiveRiskState = "gidh-intraday:live:risk"
	KeyLiveEvents    = "gidh-intraday:live:events"
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
