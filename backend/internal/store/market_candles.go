package store

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
)

type MarketCandle struct {
	Timestamp time.Time
	Open      float64
	High      float64
	Low       float64
	Close     float64
	Volume    int64
	OI        int64
}

type MarketCandleWithID struct {
	InstrumentID int64
	Candle       MarketCandle
}

type RejectedMarketCandle struct {
	MarketCandle
	Reason string
}

type MarketCandleRepo struct{ db *DB }

func NewMarketCandleRepo(db *DB) *MarketCandleRepo { return &MarketCandleRepo{db: db} }

func (r *MarketCandleRepo) UpsertCashDaily(ctx context.Context, instrumentID int64, candles []MarketCandle) (int64, int, error) {
	return r.upsert(ctx, "market.cash_candles_1d", "session_date", "instrument_id", instrumentID, candles, true, false)
}

func (r *MarketCandleRepo) UpsertFutureDaily(ctx context.Context, contractID int64, candles []MarketCandle) (int64, int, error) {
	return r.upsert(ctx, "market.future_candles_1d", "session_date", "future_contract_id", contractID, candles, true, true)
}

func (r *MarketCandleRepo) UpsertCashMinute(ctx context.Context, instrumentID int64, candles []MarketCandle) (int64, int, error) {
	return r.upsert(ctx, "market.cash_candles_1m", "ts", "instrument_id", instrumentID, candles, false, false)
}

func (r *MarketCandleRepo) UpsertFutureMinute(ctx context.Context, contractID int64, candles []MarketCandle) (int64, int, error) {
	return r.upsert(ctx, "market.future_candles_1m", "ts", "future_contract_id", contractID, candles, false, true)
}

func (r *MarketCandleRepo) UpsertCashMinuteBulk(ctx context.Context, items []MarketCandleWithID) error {
	if len(items) == 0 {
		return nil
	}
	batch := &pgx.Batch{}
	query := `
		INSERT INTO market.cash_candles_1m (ts, instrument_id, open, high, low, close, volume, source_ts, received_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
		ON CONFLICT (ts, instrument_id) DO UPDATE SET
			open = EXCLUDED.open,
			high = EXCLUDED.high,
			low = EXCLUDED.low,
			close = EXCLUDED.close,
			volume = EXCLUDED.volume,
			source_ts = EXCLUDED.source_ts,
			received_at = NOW();
	`
	for _, item := range items {
		c := item.Candle
		if c.Open <= 0 || c.High <= 0 || c.Low <= 0 || c.Close <= 0 {
			continue
		}
		batch.Queue(query, c.Timestamp, item.InstrumentID, c.Open, c.High, c.Low, c.Close, c.Volume, c.Timestamp)
	}

	results := r.db.Pool.SendBatch(ctx, batch)
	defer results.Close()

	for i := 0; i < batch.Len(); i++ {
		if _, err := results.Exec(); err != nil {
			return err
		}
	}
	return nil
}
