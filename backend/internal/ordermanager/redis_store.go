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

func (s *RedisOrderStore) SaveVirtualBracketOrder(ctx context.Context, vbo *VirtualBracketOrder) error {
	if s.client == nil || vbo == nil {
		return nil
	}
	data, err := json.Marshal(vbo)
	if err != nil {
		return err
	}
	return s.client.HSet(ctx, KeyLiveOrders, vbo.ID, data).Err()
}

func (s *RedisOrderStore) GetVirtualBracketOrders(ctx context.Context) (map[string]*VirtualBracketOrder, error) {
	if s.client == nil {
		return make(map[string]*VirtualBracketOrder), nil
	}
	dataMap, err := s.client.HGetAll(ctx, KeyLiveOrders).Result()
	if err != nil {
		return nil, err
	}
	res := make(map[string]*VirtualBracketOrder)
	for id, val := range dataMap {
		var vbo VirtualBracketOrder
		if err := json.Unmarshal([]byte(val), &vbo); err == nil {
			res[id] = &vbo
		}
	}
	return res, nil
}

func (s *RedisOrderStore) RemoveVirtualBracketOrder(ctx context.Context, id string) error {
	if s.client == nil {
		return nil
	}
	return s.client.HDel(ctx, KeyLiveOrders, id).Err()
}
