package marketdata

import (
	"sync"
	"time"

	"gidh-intraday/backend/internal/store"

	"github.com/redis/go-redis/v9"
	kitemodels "github.com/zerodha/gokiteconnect/v4/models"
	kiteticker "github.com/zerodha/gokiteconnect/v4/ticker"
)

type InstrumentState struct {
	InstrumentID int64
	Symbol       string
	Exchange     string
	CashToken    uint32

	// Daily Baselines
	PriorClose     float64
	ATR14          float64
	ADR20          float64
	ExpectedVolMap map[int16]int64

	// Session Accumulators
	HasSessionOpen bool
	SessionOpen    float64
	SessionHigh    float64
	SessionLow     float64
	CumVolume      int64
	CumTurnover    float64
	CumSqTurnover  float64

	// Opening Ranges
	OR15High *float64
	OR15Low  *float64
	OR30High *float64
	OR30Low  *float64

	// Log Returns Ring Buffer (for 5m, 15m, 30m Realized Volatility)
	LogReturns []float64
	LastClose  float64

	// Minute Bucket (Current minute under construction)
	MinOpen         float64
	MinHigh         float64
	MinLow          float64
	MinClose        float64
	MinVolume       int64
	LastDayCashVol  int64
	HasTickInMinute bool

	Candles []LiveCandle
}

type UniverseStreamEngine struct {
	apiKey           string
	accessToken      string
	instrumentRepo   *store.MarketInstrumentRepo
	candleRepo       *store.MarketCandleRepo
	dailyFeatureRepo *store.DailyFeatureRepo
	redisClient      *redis.Client

	ticker        *kiteticker.Ticker
	mu            sync.RWMutex
	instruments   map[uint32]*InstrumentState // token -> state
	symbolToToken map[string]uint32
	featureRunID  string
	sessionDate   string
	loc           *time.Location

	tickListeners  []func(symbol string, tick kitemodels.Tick)
	sectorResolver func(symbol string) string
	isRunning      bool
}

func NewUniverseStreamEngine(
	apiKey, accessToken string,
	ir *store.MarketInstrumentRepo,
	cr *store.MarketCandleRepo,
	fr *store.DailyFeatureRepo,
) *UniverseStreamEngine {
	loc, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		loc = time.Local
	}

	return &UniverseStreamEngine{
		apiKey:           apiKey,
		accessToken:      accessToken,
		instrumentRepo:   ir,
		candleRepo:       cr,
		dailyFeatureRepo: fr,
		instruments:      make(map[uint32]*InstrumentState),
		symbolToToken:    make(map[string]uint32),
		loc:              loc,
	}
}

func (e *UniverseStreamEngine) SetRedisClient(client *redis.Client) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.redisClient = client
}
