package marketdata

import (
	"context"
	"errors"
	"fmt"
	"time"

	"gidh-intraday/backend/internal/kite"
	"gidh-intraday/backend/internal/store"
)

const minuteChunkDays = 30

type BackfillOptions struct {
	DailyDays  int
	MinuteDays int
	From       time.Time
	To         time.Time
	Symbol     string
	Progress   func(symbol string, current, total int, result BackfillResult)
}

type BackfillResult struct {
	CashDaily    int64
	FutureDaily  int64
	CashMinute   int64
	FutureMinute int64
	Rejected     int
	Error        string
}

type Backfiller struct {
	client  *kite.Client
	pairs   *store.MarketInstrumentRepo
	candles *store.MarketCandleRepo
}

func NewBackfiller(client *kite.Client, pairs *store.MarketInstrumentRepo, candles *store.MarketCandleRepo) *Backfiller {
	return &Backfiller{client: client, pairs: pairs, candles: candles}
}

func (b *Backfiller) Run(ctx context.Context, options BackfillOptions) error {
	hasRange := !options.From.IsZero() || !options.To.IsZero()
	if hasRange && (options.From.IsZero() || options.To.IsZero() || !options.From.Before(options.To)) {
		return fmt.Errorf("backfill range requires a valid from and to timestamp")
	}
	if !hasRange && (options.DailyDays < 1 || options.MinuteDays < 1) {
		return fmt.Errorf("daily-days and minute-days must be positive")
	}
	pairs, err := b.pairs.ActivePairs(ctx)
	if err != nil {
		return err
	}
	if options.Symbol != "" {
		filtered := make([]store.ActiveMarketPair, 0, 1)
		for _, pair := range pairs {
			if pair.Symbol == options.Symbol {
				filtered = append(filtered, pair)
			}
		}
		if len(filtered) == 0 {
			return fmt.Errorf("active symbol %s was not found", options.Symbol)
		}
		pairs = filtered
	}
	now := time.Now()
	errs := make([]error, 0)
	for index, pair := range pairs {
		result, err := b.backfillPair(ctx, pair, now, options)
		if err != nil {
			result.Error = err.Error()
		}
		if options.Progress != nil {
			options.Progress(pair.Symbol, index+1, len(pairs), result)
		}
		if err != nil {
			errs = append(errs, fmt.Errorf("%s: %w", pair.Symbol, err))
		}
	}
	return errors.Join(errs...)
}
