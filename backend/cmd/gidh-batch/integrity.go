package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"time"

	"gidh-intraday/backend/internal/batch/integrity"
	"gidh-intraday/backend/internal/config"
	"gidh-intraday/backend/internal/kite"
	"gidh-intraday/backend/internal/marketdata"
	"gidh-intraday/backend/internal/store"
)

func runEODIntegrity(args []string) {
	flags := flag.NewFlagSet("integrity eod", flag.ExitOnError)
	sessionDate := flags.String("session-date", indiaToday(), "closed trading session to repair (YYYY-MM-DD)")
	version := flags.String("version", "daily-v1", "daily baseline version")
	_ = flags.Parse(args)
	validateDate(*sessionDate)

	ctx := context.Background()
	dbURL, err := config.LoadDatabaseURL()
	if err != nil {
		log.Fatal(err)
	}
	db, err := store.NewDB(ctx, dbURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	job := integrity.Job{
		Features: store.NewDailyFeatureRepo(db),
		Version:  *version,
		Repair:   repairSession(db),
	}
	report, err := job.Run(ctx, *sessionDate)
	if err != nil {
		log.Fatal(err)
	}
	if report.Skipped {
		fmt.Printf("integrity skipped: backend already published %s as READY\n", report.SessionDate)
		return
	}
	fmt.Printf("integrity repaired: session=%s intraday_feature_rows=%d\n", report.SessionDate, report.IntradayFeatureRows)
}

func repairSession(db *store.DB) integrity.Repair {
	return func(ctx context.Context, sessionDate string) error {
		cfg, err := config.LoadData()
		if err != nil {
			return err
		}
		location, err := time.LoadLocation("Asia/Kolkata")
		if err != nil {
			return err
		}
		from, err := time.ParseInLocation(time.DateOnly, sessionDate, location)
		if err != nil {
			return err
		}
		backfiller := marketdata.NewBackfiller(
			kite.NewClient(cfg.KiteAPIKey, cfg.KiteAccessToken),
			store.NewMarketInstrumentRepo(db),
			store.NewMarketCandleRepo(db),
		)
		return backfiller.Run(ctx, marketdata.BackfillOptions{
			From: from, To: from.AddDate(0, 0, 1),
			Progress: func(symbol string, current, total int, result marketdata.BackfillResult) {
				if result.Error != "" {
					fmt.Printf("[%03d/%03d] %s | ERROR: %s\n", current, total, symbol, result.Error)
					return
				}
				fmt.Printf("[%03d/%03d] %s | cash: %d daily, %d minute | future: %d daily, %d minute\n", current, total, symbol, result.CashDaily, result.CashMinute, result.FutureDaily, result.FutureMinute)
			},
		})
	}
}
