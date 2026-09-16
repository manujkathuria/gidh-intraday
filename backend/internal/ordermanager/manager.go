package ordermanager

import (
	"sync"

	"gidh-intraday/backend/internal/kite"
	"gidh-intraday/backend/internal/marketdata"
	"gidh-intraday/backend/internal/store"

	kitemodels "github.com/zerodha/gokiteconnect/v4/models"
)

type Manager struct {
	kiteClient     *kite.Client
	redisStore     *RedisOrderStore
	instrumentRepo *store.MarketInstrumentRepo
	tracker        *marketdata.ActivePositionTracker
	db             *store.DB

	mu             sync.RWMutex
	capitalPool    float64
	leverageMIS    float64
	marginPerSlot  float64
	maxSlots       int
	isPaperTrading bool
}

func NewManager(
	kc *kite.Client,
	rs *RedisOrderStore,
	ir *store.MarketInstrumentRepo,
	tracker *marketdata.ActivePositionTracker,
	db *store.DB,
	isPaper bool,
) *Manager {
	m := &Manager{
		kiteClient:     kc,
		redisStore:     rs,
		instrumentRepo: ir,
		tracker:        tracker,
		db:             db,
		capitalPool:    50000.0,
		leverageMIS:    5.0,
		marginPerSlot:  10000.0,
		maxSlots:       5,
		isPaperTrading: isPaper,
	}

	if tracker != nil {
		tracker.SetOnTickHandler(func(symbol string, tick kitemodels.Tick) {
			m.handleTick(symbol, tick)
		})
	}

	return m
}
