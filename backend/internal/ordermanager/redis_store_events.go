package ordermanager

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
)

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

func (s *Store) SetRiskState(ctx context.Context, state *RiskState) error {
	data, err := json.Marshal(state)
	if err != nil {
		return err
	}
	if err := s.client.Set(ctx, KeyRiskState, data, 0).Err(); err != nil {
		return err
	}
	return s.PublishEvent(ctx, "RISK_STATE_CHANGED", state)
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
