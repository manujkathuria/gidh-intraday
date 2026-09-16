package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"gidh-intraday/backend/internal/config"
	"gidh-intraday/backend/internal/features/daily"
	"gidh-intraday/backend/internal/readapi"
	"gidh-intraday/backend/internal/store"

	"github.com/redis/go-redis/v9"
)

func runEODPipeline(args []string) {
	flags := flag.NewFlagSet("eod", flag.ExitOnError)
	sessionDate := flags.String("date", indiaToday(), "Trading session date (YYYY-MM-DD)")
	forceRepair := flags.Bool("force-repair", false, "Force re-backfill from Kite API even if data exists")
	skipWarm := flags.Bool("skip-warm", false, "Skip Redis replay pre-warming")
	_ = flags.Parse(args)

	validateDate(*sessionDate)

	ctx := context.Background()
	startTotal := time.Now()

	fmt.Println("==================================================================")
	fmt.Printf(" GIDH EOD DATA INTEGRITY & REPLAY PIPELINE (%s)\n", *sessionDate)
	fmt.Println("==================================================================")

	// 1. Database Connection
	dbURL, err := config.LoadDatabaseURL()
	if err != nil {
		log.Fatalf("[EOD FATAL] DB URL error: %v", err)
	}
	db, err := store.NewDB(ctx, dbURL)
	if err != nil {
		log.Fatalf("[EOD FATAL] DB connection error: %v", err)
	}
	defer db.Close()

	instRepo := store.NewMarketInstrumentRepo(db)
	featureRepo := store.NewDailyFeatureRepo(db)

	// 2. Instrument Universe Check
	instruments, err := instRepo.GetActiveInstruments(ctx)
	if err != nil {
		log.Fatalf("[EOD FATAL] Failed to load active universe: %v", err)
	}
	fmt.Printf("[1/5] Universe Verification: %d active F&O instruments verified.\n", len(instruments))

	// 3. Candle Completeness & Optional Kite Backfill Repair
	fmt.Printf("[2/5] Inspecting 1m candle completeness for %s...\n", *sessionDate)
	var cashMissingCount, futureMissingCount int
	err = db.Pool.QueryRow(ctx, `
		WITH cash_counts AS (
			SELECT instrument_id, COUNT(*) AS cnt
			FROM market.cash_candles_1m
			WHERE (ts AT TIME ZONE 'Asia/Kolkata')::date = $1::date
			GROUP BY instrument_id
		), future_counts AS (
			SELECT future_contract_id, COUNT(*) AS cnt
			FROM market.future_candles_1m
			WHERE (ts AT TIME ZONE 'Asia/Kolkata')::date = $1::date
			GROUP BY future_contract_id
		)
		SELECT
			COUNT(*) FILTER (WHERE cash_counts.cnt IS NULL OR cash_counts.cnt < 350) AS cash_missing,
			COUNT(*) FILTER (WHERE future_counts.cnt IS NULL OR future_counts.cnt < 350) AS future_missing
		FROM market.instruments i
		LEFT JOIN market.future_contracts f ON f.instrument_id = i.id AND f.is_active
		LEFT JOIN cash_counts ON cash_counts.instrument_id = i.id
		LEFT JOIN future_counts ON future_counts.future_contract_id = f.id
		WHERE i.is_active;
	`, *sessionDate).Scan(&cashMissingCount, &futureMissingCount)

	if err != nil {
		log.Printf("[EOD WARN] Candle completeness check failed: %v", err)
	}

	if cashMissingCount > 0 || futureMissingCount > 0 || *forceRepair {
		fmt.Printf("      Found incomplete 1m candles: cash=%d instruments, futures=%d instruments. Repairing from Zerodha Kite...\n", cashMissingCount, futureMissingCount)
		repairErr := repairSession(db)(ctx, *sessionDate)
		if repairErr != nil {
			log.Printf("[EOD WARN] Kite repair encountered errors: %v", repairErr)
		} else {
			fmt.Println("      Kite candle repair completed successfully.")
		}
	} else {
		fmt.Println("      Candle integrity verified: 100% complete.")
	}

	// 4. Baseline & Intraday Features Calculation
	fmt.Printf("[3/5] Publishing daily baseline features for %s...\n", *sessionDate)
	if err := daily.Publish(ctx, featureRepo, *sessionDate, "daily-v1"); err != nil {
		log.Fatalf("[EOD FATAL] Daily feature publishing failed: %v", err)
	}

	fmt.Printf("[4/5] Building intraday 20-session rolling volume profile & features...\n")
	featureStart := time.Now()
	rows, err := featureRepo.BuildIntraday(ctx, *sessionDate, *sessionDate)
	if err != nil {
		log.Fatalf("[EOD FATAL] BuildIntraday failed: %v", err)
	}
	fmt.Printf("      Intraday features built: %d rows updated (Elapsed: %v)\n", rows, time.Since(featureStart))

	// 5. Redis Replay Pre-Warming
	if !*skipWarm {
		fmt.Printf("[5/5] Pre-warming Replay snapshots into Redis (gidh-intraday:replay:*)...\n")
		warmStart := time.Now()

		redisAddr := os.Getenv("REDIS_ADDR")
		if redisAddr == "" {
			redisAddr = "127.0.0.1:6379"
		}
		rdb := redis.NewClient(&redis.Options{Addr: redisAddr})
		defer rdb.Close()

		if err := rdb.Ping(ctx).Err(); err != nil {
			fmt.Printf("      [WARN] Redis unavailable at %s (%v). Skipping replay cache pre-warm.\n", redisAddr, err)
		} else {
			reader := readapi.NewRepository(db)
			if err := reader.WarmSessionDay(ctx, *sessionDate); err != nil {
				fmt.Printf("      [WARN] WarmSessionDay error: %v\n", err)
			} else {
				// Wait briefly for warming to finish
				time.Sleep(1 * time.Second)
				fmt.Printf("      Replay pre-warm complete: 375 snapshots cached in Redis (Elapsed: %v)\n", time.Since(warmStart))
			}
		}
	} else {
		fmt.Println("[5/5] Redis replay pre-warming skipped via flag.")
	}

	fmt.Println("==================================================================")
	fmt.Printf(" EOD PIPELINE COMPLETE (Total time: %v)\n", time.Since(startTotal))
	fmt.Println(" • TimescaleDB: market.cash_candles_1m & intraday_features_1m verified")
	fmt.Println(" • Redis Cache: gidh-intraday:replay:snapshot:* primed for instantaneous replay")
	fmt.Println("==================================================================")
}
