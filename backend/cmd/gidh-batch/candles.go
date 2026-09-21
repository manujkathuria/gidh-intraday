package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"time"

	"gidh-intraday/backend/internal/config"
	"gidh-intraday/backend/internal/kite"
	"gidh-intraday/backend/internal/marketdata"
	"gidh-intraday/backend/internal/store"
)

func backfillCandles(args []string) {
	flags := flag.NewFlagSet("candles backfill", flag.ExitOnError)
	dailyDays := flags.Int("daily-days", 365, "calendar days of daily candle history")
	minuteDays := flags.Int("minute-days", 60, "calendar days of minute candle history")
	fromStr := flags.String("from", "", "from date (YYYY-MM-DD or RFC3339)")
	toStr := flags.String("to", "", "to date (YYYY-MM-DD or RFC3339)")
	symbol := flags.String("symbol", "", "one symbol to backfill; omit for the active universe")
	_ = flags.Parse(args)

	var fromTime, toTime time.Time
	if *fromStr != "" {
		if t, err := time.Parse("2006-01-02", *fromStr); err == nil {
			fromTime = t
		} else if t, err := time.Parse(time.RFC3339, *fromStr); err == nil {
			fromTime = t
		} else {
			log.Fatalf("invalid --from date format: %v", err)
		}
	}
	if *toStr != "" {
		if t, err := time.Parse("2006-01-02", *toStr); err == nil {
			toTime = t.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
		} else if t, err := time.Parse(time.RFC3339, *toStr); err == nil {
			toTime = t
		} else {
			log.Fatalf("invalid --to date format: %v", err)
		}
	}

	ctx := context.Background()
	cfg, err := config.LoadData()
	if err != nil {
		log.Fatal(err)
	}
	db, err := store.NewDB(ctx, cfg.DBURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	backfiller := marketdata.NewBackfiller(
		kite.NewClient(cfg.KiteAPIKey, cfg.KiteAccessToken),
		store.NewMarketInstrumentRepo(db),
		store.NewMarketCandleRepo(db),
	)
	err = backfiller.Run(ctx, marketdata.BackfillOptions{
		DailyDays: *dailyDays, MinuteDays: *minuteDays, From: fromTime, To: toTime, Symbol: *symbol,
		Progress: func(symbol string, current, total int, result marketdata.BackfillResult) {
			if result.Error != "" {
				fmt.Printf("[%03d/%03d] %s | ERROR: %s\n", current, total, symbol, result.Error)
				return
			}
			fmt.Printf("[%03d/%03d] %s | cash: %d daily, %d minute | future: %d daily, %d minute | rejected: %d\n", current, total, symbol, result.CashDaily, result.CashMinute, result.FutureDaily, result.FutureMinute, result.Rejected)
		},
	})
	if err != nil {
		log.Fatal(err)
	}
}
