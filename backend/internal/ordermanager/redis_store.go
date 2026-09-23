package ordermanager

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	KeyOrders                = "gidh-intraday:live:orders"
	KeyPositions             = "gidh-intraday:live:positions"
	KeyClientOrders          = "gidh-intraday:live:client-orders"
	KeyInterestedTokens      = "gidh-intraday:live:interested-tokens"
	KeyOrderEvents           = "gidh-intraday:live:order-events"
	KeyLiveEvents            = "gidh-intraday:live:events"
	KeyRiskState             = "gidh-intraday:live:risk"
	KeyPositionExits         = "gidh-intraday:live:position-exits"
	KeyClosedPositionsPrefix = "gidh-intraday:live:closed-positions:"
	legacyPositionsKey       = "gidh-intraday:live:positions:active"
	legacyOrdersKey          = "gidh-intraday:live:orders:active"
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
	return nil
}
