package marketdata

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"gidh-intraday/backend/internal/kite"
	"gidh-intraday/backend/internal/store"
)

type LivePoller struct {
	kiteClient     *kite.Client
	instrumentRepo *store.MarketInstrumentRepo
	candleRepo     *store.MarketCandleRepo
	featureRepo    *store.DailyFeatureRepo
	interval       time.Duration
}

func NewLivePoller(
	kc *kite.Client,
	ir *store.MarketInstrumentRepo,
	cr *store.MarketCandleRepo,
	fr *store.DailyFeatureRepo,
	interval time.Duration,
) *LivePoller {
	if interval <= 0 {
		interval = 30 * time.Second
	}
	return &LivePoller{
		kiteClient:     kc,
		instrumentRepo: ir,
		candleRepo:     cr,
		featureRepo:    fr,
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

	log.Printf("[LIVE POLLER] Initialized for %d active universe instruments (Poll interval: %v)", len(instruments), p.interval)

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

func (p *LivePoller) pollOnce(ctx context.Context, quoteKeys []string, instMap map[string]store.ActiveInstrument, loc *time.Location) {
	start := time.Now()
	nowIST := start.In(loc)
	todayStr := nowIST.Format("2006-01-02")
	timeStr := nowIST.Format("15:04:05")

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

			candle := store.MarketCandle{
				Timestamp: candleTime,
				Open:      q.OHLC.Open,
				High:      q.OHLC.High,
				Low:       q.OHLC.Low,
				Close:     q.LastPrice,
				Volume:    int64(q.Volume),
			}

			// Upsert candle into market.cash_candles_1m
			_, _, err := p.candleRepo.UpsertCashMinute(ctx, inst.ID, []store.MarketCandle{candle})
			if err != nil {
				log.Printf("[LIVE POLLER ERROR] UpsertCashMinute for %s failed: %v", sym, err)
			} else {
				totalIngested++
			}
		}
	}

	// Update intraday features (RVOL, VWAP, CLV) for today
	nFeatures, err := p.featureRepo.BuildIntraday(ctx, todayStr, todayStr)
	elapsed := time.Since(start)

	if err != nil {
		log.Printf("[LIVE POLLER %s] Ingested %d symbols | Feature build error: %v (Elapsed: %v)", timeStr, totalIngested, err, elapsed)
	} else {
		log.Printf("[LIVE POLLER %s] Ingested %d symbols | Features updated (%d rows) | Elapsed: %v", timeStr, totalIngested, nFeatures, elapsed)
	}
}
