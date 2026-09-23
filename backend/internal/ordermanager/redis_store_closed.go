package ordermanager

import (
	"context"
	"encoding/json"
	"sort"
	"time"

	"github.com/redis/go-redis/v9"
)

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

	diff := fillPrice - position.EntryPrice
	if position.Side == SideShort {
		diff = -diff
	}
	pnlInr := diff * float64(position.Quantity)
	pnlPct := 0.0
	if position.EntryPrice > 0 {
		pnlPct = diff / position.EntryPrice * 100
	}
	closedPos := &ClosedPosition{
		ID:              current.ID,
		Symbol:          position.Symbol,
		Exchange:        position.Exchange,
		InstrumentToken: position.InstrumentToken,
		Side:            position.Side,
		Quantity:        position.Quantity,
		EntryPrice:      position.EntryPrice,
		ExitPrice:       fillPrice,
		PnLINR:          pnlInr,
		PnLPct:          pnlPct,
		OpenedAt:        position.OpenedAt,
		ClosedAt:        now,
		ExitReason:      current.Invalidation,
		BrokerOrderID:   current.BrokerOrderID,
	}
	closedData, err := json.Marshal(closedPos)
	if err != nil {
		return nil, err
	}

	orderEvent, err := eventJSON("ORDER_STATUS_CHANGED", &next)
	if err != nil {
		return nil, err
	}
	positionEvent, err := eventJSON("POSITION_CLOSED", closedPos)
	if err != nil {
		return nil, err
	}

	dateKey := KeyClosedPositionsPrefix + now.Format("2006-01-02")

	script := redis.NewScript(`
local raw = redis.call('HGET', KEYS[1], ARGV[1])
if not raw then return 0 end
local current = cjson.decode(raw)
if current.status ~= ARGV[2] or tonumber(current.revision) ~= tonumber(ARGV[3]) then return -1 end
redis.call('HSET', KEYS[1], ARGV[1], ARGV[4])
redis.call('HDEL', KEYS[2], ARGV[5])
redis.call('HDEL', KEYS[3], ARGV[5])
redis.call('HSET', KEYS[6], ARGV[8], ARGV[9])
redis.call('EXPIRE', KEYS[6], 172800)
redis.call('XADD', KEYS[4], '*', 'event', ARGV[6])
redis.call('XADD', KEYS[4], '*', 'event', ARGV[7])
redis.call('PUBLISH', KEYS[5], ARGV[6])
redis.call('PUBLISH', KEYS[5], ARGV[7])
return 1
`)
	result, err := script.Run(ctx, s.client,
		[]string{KeyOrders, KeyPositions, KeyPositionExits, KeyOrderEvents, KeyLiveEvents, dateKey},
		current.ID, string(current.Status), current.Revision, orderData, position.Symbol, orderEvent, positionEvent, closedPos.ID, closedData,
	).Int()
	if err != nil {
		return nil, err
	}
	if result != 1 {
		return nil, ErrTransitionConflict
	}
	return &next, nil
}

func (s *Store) ListClosedPositions(ctx context.Context, date string) ([]*ClosedPosition, error) {
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	key := KeyClosedPositionsPrefix + date
	values, err := s.client.HGetAll(ctx, key).Result()
	if err != nil {
		return nil, err
	}
	list := make([]*ClosedPosition, 0, len(values))
	for _, raw := range values {
		var cp ClosedPosition
		if json.Unmarshal([]byte(raw), &cp) == nil {
			list = append(list, &cp)
		}
	}
	sort.Slice(list, func(i, j int) bool {
		return list[i].ClosedAt.After(list[j].ClosedAt)
	})
	return list, nil
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
