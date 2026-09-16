package ordermanager

import (
	"context"
	"encoding/json"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

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
