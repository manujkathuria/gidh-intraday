package marketdata

import (
	"context"
	"fmt"
	"log"
	"math"
	"strconv"
	"strings"
	"time"

	"gidh-intraday/backend/internal/kite"
	"gidh-intraday/backend/internal/store"

	"github.com/redis/go-redis/v9"
)

const redisPollerStateKey = "gidh:live:poller:state"

type pollerPrevState struct {
	sessionDate string
	lastDayVol  int64
	lastClose   float64
}

type LivePoller struct {
	kiteClient     *kite.Client
	instrumentRepo *store.MarketInstrumentRepo
	candleRepo     *store.MarketCandleRepo
	featureRepo    *store.DailyFeatureRepo
	rdb            *redis.Client
	interval       time.Duration
}

func NewLivePoller(
	kc *kite.Client,
	ir *store.MarketInstrumentRepo,
	cr *store.MarketCandleRepo,
	fr *store.DailyFeatureRepo,
	rdb *redis.Client,
	interval time.Duration,
) *LivePoller {
	if interval <= 0 {
		interval = 60 * time.Second
	}
	return &LivePoller{
		kiteClient:     kc,
		instrumentRepo: ir,
		candleRepo:     cr,
		featureRepo:    fr,
		rdb:            rdb,
		interval:       interval,
	}
}

func (p *LivePoller) Run(ctx context.Context) error {
	loc, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		loc = time.Local
	}

	instruments, err := p.instrumentRepo.GetActiveInstruments(ctx)
	if err != nil {
		return fmt.Errorf("failed to fetch active instruments: %w", err)
	}
	if len(instruments) == 0 {
		return fmt.Errorf("no active instruments found in database")
	}

	log.Printf("[LIVE POLLER] Initialized for %d active universe instruments (Poll interval: %v, State: Redis)", len(instruments), p.interval)

	// Map symbol -> instrument
	instMap := make(map[string]store.ActiveInstrument)
	var quoteKeys []string
	for _, inst := range instruments {
		key := fmt.Sprintf("%s:%s", inst.Exchange, inst.Symbol)
		quoteKeys = append(quoteKeys, key)
		instMap[inst.Symbol] = inst
		instMap[key] = inst
	}

	ticker := time.NewTicker(p.interval)
	defer ticker.Stop()

	// Initial poll immediately
	p.pollOnce(ctx, quoteKeys, instMap, loc)

	for {
		select {
		case <-ctx.Done():
			log.Println("[LIVE POLLER] Stopping live ingestion...")
			return ctx.Err()
		case <-ticker.C:
			p.pollOnce(ctx, quoteKeys, instMap, loc)
		}
	}
}

func (p *LivePoller) isMarketHours(nowIST time.Time) bool {
	// Mon (1) to Fri (5)
	if nowIST.Weekday() == time.Saturday || nowIST.Weekday() == time.Sunday {
		return false
	}
	minOfDay := nowIST.Hour()*60 + nowIST.Minute()
	// 9:15 AM (555 mins) to 3:30 PM (930 mins)
	return minOfDay >= 555 && minOfDay <= 930
}

func (p *LivePoller) loadRedisState(ctx context.Context) map[string]pollerPrevState {
	states := make(map[string]pollerPrevState)
	if p.rdb == nil {
		return states
	}

	raw, err := p.rdb.HGetAll(ctx, redisPollerStateKey).Result()
	if err != nil {
		log.Printf("[LIVE POLLER WARN] Failed to load Redis state: %v", err)
		return states
	}

	for sym, val := range raw {
		parts := strings.Split(val, "|")
		if len(parts) == 3 {
			vol, _ := strconv.ParseInt(parts[1], 10, 64)
			closePr, _ := strconv.ParseFloat(parts[2], 64)
			states[sym] = pollerPrevState{
				sessionDate: parts[0],
				lastDayVol:  vol,
				lastClose:   closePr,
			}
		}
	}
	return states
}

func (p *LivePoller) pollOnce(ctx context.Context, quoteKeys []string, instMap map[string]store.ActiveInstrument, loc *time.Location) {
	start := time.Now()
	nowIST := start.In(loc)
	todayStr := nowIST.Format("2006-01-02")
	timeStr := nowIST.Format("15:04:05")

	if !p.isMarketHours(nowIST) {
		log.Printf("[LIVE POLLER] Market closed (%s IST). Polling paused until 09:15 IST.", timeStr)
		return
	}

	// Load previous 1m state from Redis
	prevStates := p.loadRedisState(ctx)
	nextStates := make(map[string]interface{})

	// Kite quote batch in chunks of 200
	chunkSize := 200
	totalIngested := 0

	for i := 0; i < len(quoteKeys); i += chunkSize {
		end := i + chunkSize
		if end > len(quoteKeys) {
			end = len(quoteKeys)
		}
		batch := quoteKeys[i:end]

		quotes, err := p.kiteClient.FetchQuote(ctx, batch...)
		if err != nil {
			log.Printf("[LIVE POLLER ERROR] FetchQuote failed (%s): %v", timeStr, err)
			return
		}

		for key, q := range quotes {
			parts := strings.Split(key, ":")
			sym := key
			if len(parts) == 2 {
				sym = parts[1]
			}
			inst, ok := instMap[sym]
			if !ok {
				continue
			}

			// Current minute bar timestamp
			candleTime := time.Date(nowIST.Year(), nowIST.Month(), nowIST.Day(), nowIST.Hour(), nowIST.Minute(), 0, 0, loc)

			closePrice := q.LastPrice
			openPrice := closePrice
			highPrice := closePrice
			lowPrice := closePrice
			minuteVolume := int64(0)

			prev, hasPrev := prevStates[sym]
			if hasPrev && prev.sessionDate == todayStr {
				// We have continuous minute tracking in Redis for today
				deltaVol := int64(q.Volume) - prev.lastDayVol
				if deltaVol < 0 {
					deltaVol = 0
				}
				minuteVolume = deltaVol

				if prev.lastClose > 0 {
					openPrice = prev.lastClose
					highPrice = math.Max(openPrice, closePrice)
					lowPrice = math.Min(openPrice, closePrice)
				}
			} else {
				// First tick of the day or poller initialization
				if nowIST.Hour() == 9 && nowIST.Minute() <= 16 {
					openPrice = q.OHLC.Open
					highPrice = math.Max(openPrice, closePrice)
					lowPrice = math.Min(openPrice, closePrice)
					minuteVolume = int64(q.Volume)
				} else {
					// Mid-day start: initialize baseline cleanly without writing entire day's cumulative volume
					openPrice = closePrice
					highPrice = closePrice
					lowPrice = closePrice
					minuteVolume = 0
				}
			}

			candle := store.MarketCandle{
				Timestamp: candleTime,
				Open:      openPrice,
				High:      highPrice,
				Low:       lowPrice,
				Close:     closePrice,
				Volume:    minuteVolume,
			}

			// Upsert candle into market.cash_candles_1m
			_, _, err = p.candleRepo.UpsertCashMinute(ctx, inst.ID, []store.MarketCandle{candle})
			if err != nil {
				log.Printf("[LIVE POLLER ERROR] UpsertCashMinute for %s failed: %v", sym, err)
			} else {
				totalIngested++
			}

			// Save state for next minute's delta computation
			nextStates[sym] = fmt.Sprintf("%s|%d|%.4f", todayStr, q.Volume, closePrice)
		}
	}

	// Persist state to Redis
	if p.rdb != nil && len(nextStates) > 0 {
		if err := p.rdb.HSet(ctx, redisPollerStateKey, nextStates).Err(); err != nil {
			log.Printf("[LIVE POLLER WARN] Failed to save state to Redis: %v", err)
		}
	}

	elapsed := time.Since(start)
	log.Printf("[LIVE POLLER %s] Ingested %d symbols (Elapsed: %v)", timeStr, totalIngested, elapsed)
}
