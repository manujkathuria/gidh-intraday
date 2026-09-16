package marketdata

import (
	"context"
	"time"

	"gidh-intraday/backend/internal/store"

	"github.com/zerodha/gokiteconnect/v4"
)

func (b *Backfiller) backfillPair(ctx context.Context, pair store.ActiveMarketPair, now time.Time, options BackfillOptions) (BackfillResult, error) {
	result := BackfillResult{}
	if !options.From.IsZero() {
		if err := b.backfillRange(ctx, pair, "day", options.From, options.To, &result); err != nil {
			return result, err
		}
		if err := b.backfillRange(ctx, pair, "minute", options.From, options.To, &result); err != nil {
			return result, err
		}
		return result, nil
	}
	dailyFrom := now.AddDate(0, 0, -options.DailyDays)
	if err := b.backfillRange(ctx, pair, "day", dailyFrom, now, &result); err != nil {
		return result, err
	}
	minuteFrom := now.AddDate(0, 0, -options.MinuteDays)
	for start := minuteFrom; start.Before(now); {
		end := start.AddDate(0, 0, minuteChunkDays)
		if end.After(now) {
			end = now
		}
		if err := b.backfillRange(ctx, pair, "minute", start, end, &result); err != nil {
			return result, err
		}
		start = end.Add(time.Second)
	}
	return result, nil
}

func (b *Backfiller) backfillRange(ctx context.Context, pair store.ActiveMarketPair, interval string, from, to time.Time, result *BackfillResult) error {
	cash, err := b.client.FetchHistorical(ctx, int(pair.CashToken), interval, from, to, false)
	if err != nil {
		return err
	}
	future, err := b.client.FetchHistorical(ctx, int(pair.FutureToken), interval, from, to, true)
	if err != nil {
		return err
	}
	cashRows, cashRejected, err := b.writeCash(ctx, pair.InstrumentID, interval, cash)
	if err != nil {
		return err
	}
	futureRows, futureRejected, err := b.writeFuture(ctx, pair.FutureContractID, interval, future)
	if err != nil {
		return err
	}
	if interval == "day" {
		result.CashDaily += cashRows
		result.FutureDaily += futureRows
	} else {
		result.CashMinute += cashRows
		result.FutureMinute += futureRows
	}
	result.Rejected += cashRejected + futureRejected
	return nil
}

func (b *Backfiller) writeCash(ctx context.Context, id int64, interval string, raw []kiteconnect.HistoricalData) (int64, int, error) {
	candles := toMarketCandles(raw)
	if interval == "day" {
		return b.candles.UpsertCashDaily(ctx, id, candles)
	}
	return b.candles.UpsertCashMinute(ctx, id, candles)
}

func (b *Backfiller) writeFuture(ctx context.Context, id int64, interval string, raw []kiteconnect.HistoricalData) (int64, int, error) {
	candles := toMarketCandles(raw)
	if interval == "day" {
		return b.candles.UpsertFutureDaily(ctx, id, candles)
	}
	return b.candles.UpsertFutureMinute(ctx, id, candles)
}

func toMarketCandles(raw []kiteconnect.HistoricalData) []store.MarketCandle {
	candles := make([]store.MarketCandle, len(raw))
	for i, candle := range raw {
		candles[i] = store.MarketCandle{
			Timestamp: candle.Date.Time,
			Open:      candle.Open,
			High:      candle.High,
			Low:       candle.Low,
			Close:     candle.Close,
			Volume:    int64(candle.Volume),
			OI:        int64(candle.OI),
		}
	}
	return candles
}
