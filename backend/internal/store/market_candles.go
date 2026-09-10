package store

import (
	"context"
	"fmt"
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

func (r *MarketCandleRepo) upsert(ctx context.Context, table, timeColumn, idColumn string, id int64, candles []MarketCandle, daily, future bool) (int64, int, error) {
	valid, rejected := splitValidCandles(candles)
	if err := r.recordRejected(ctx, table, id, rejected, future); err != nil {
		return 0, len(rejected), err
	}
	if len(valid) == 0 {
		return 0, len(rejected), nil
	}
	columns := fmt.Sprintf("(%s, %s, open, high, low, close, volume", timeColumn, idColumn)
	values := "VALUES ($1, $2, $3, $4, $5, $6, $7"
	updates := "open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low, close = EXCLUDED.close, volume = EXCLUDED.volume, source_ts = EXCLUDED.source_ts, received_at = NOW()"
	if future {
		columns += ", open_interest"
		values += ", $8"
		updates += ", open_interest = EXCLUDED.open_interest"
	}
	columns += ", source_ts)"
	values += fmt.Sprintf(", $%d)", 8+boolInt(future))
	query := fmt.Sprintf("INSERT INTO %s %s %s ON CONFLICT (%s, %s) DO UPDATE SET %s", table, columns, values, timeColumn, idColumn, updates)

	batch := &pgx.Batch{}
	for _, candle := range valid {
		value := any(candle.Timestamp)
		if daily {
			value = candle.Timestamp.Format("2006-01-02")
		}
		args := []any{value, id, candle.Open, candle.High, candle.Low, candle.Close, candle.Volume}
		if future {
			args = append(args, candle.OI)
		}
		args = append(args, candle.Timestamp)
		batch.Queue(query, args...)
	}

	results := r.db.Pool.SendBatch(ctx, batch)
	defer results.Close()
	var count int64
	for range valid {
		tag, err := results.Exec()
		if err != nil {
			return count, len(rejected), err
		}
		count += tag.RowsAffected()
	}
	return count, len(rejected), nil
}

func splitValidCandles(candles []MarketCandle) ([]MarketCandle, []RejectedMarketCandle) {
	valid := make([]MarketCandle, 0, len(candles))
	rejected := make([]RejectedMarketCandle, 0)
	for _, candle := range candles {
		reason := candleViolation(candle)
		if reason == "" {
			valid = append(valid, candle)
			continue
		}
		rejected = append(rejected, RejectedMarketCandle{MarketCandle: candle, Reason: reason})
	}
	return valid, rejected
}

func candleViolation(candle MarketCandle) string {
	if candle.Open <= 0 || candle.High <= 0 || candle.Low <= 0 || candle.Close <= 0 {
		return "NON_POSITIVE_PRICE"
	}
	if candle.High < candle.Low {
		return "HIGH_BELOW_LOW"
	}
	if candle.High < candle.Open || candle.High < candle.Close {
		return "HIGH_BELOW_OPEN_OR_CLOSE"
	}
	if candle.Low > candle.Open || candle.Low > candle.Close {
		return "LOW_ABOVE_OPEN_OR_CLOSE"
	}
	return ""
}

func (r *MarketCandleRepo) recordRejected(ctx context.Context, source string, ownerID int64, candles []RejectedMarketCandle, future bool) error {
	if len(candles) == 0 {
		return nil
	}
	batch := &pgx.Batch{}
	for _, candle := range candles {
		var oi any
		if future {
			oi = candle.OI
		}
		batch.Queue(`
			INSERT INTO market.rejected_candles (
				source_table, owner_id, ts, open, high, low, close, volume, open_interest, rejection_reason
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			ON CONFLICT (source_table, owner_id, ts, rejection_reason) DO NOTHING;
		`, source, ownerID, candle.Timestamp, candle.Open, candle.High, candle.Low, candle.Close, candle.Volume, oi, candle.Reason)
	}
	results := r.db.Pool.SendBatch(ctx, batch)
	defer results.Close()
	for range candles {
		if _, err := results.Exec(); err != nil {
			return err
		}
	}
	return nil
}

func boolInt(value bool) int {
	if value {
		return 1
	}
	return 0
}
