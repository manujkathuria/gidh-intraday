package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"gidh-intraday/backend/internal/config"
	"gidh-intraday/backend/internal/kite"
	"gidh-intraday/backend/internal/marketdata"
	"gidh-intraday/backend/internal/store"
)

func runLiveIngestion(args []string) {
	flags := flag.NewFlagSet("live", flag.ExitOnError)
	intervalSec := flags.Int("interval", 30, "polling interval in seconds for universe REST quotes")
	_ = flags.Parse(args)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigChan
		fmt.Println("\n[LIVE ENGINE] Received termination signal. Shutting down gracefully...")
		cancel()
	}()

	cfg, err := config.LoadData()
	if err != nil {
		log.Fatalf("[LIVE ENGINE] Config error: %v", err)
	}

	db, err := store.NewDB(ctx, cfg.DBURL)
	if err != nil {
		log.Fatalf("[LIVE ENGINE] DB connection error: %v", err)
	}
	defer db.Close()

	kc := kite.NewClient(cfg.KiteAPIKey, cfg.KiteAccessToken)
	ir := store.NewMarketInstrumentRepo(db)
	cr := store.NewMarketCandleRepo(db)
	fr := store.NewDailyFeatureRepo(db)

	poller := marketdata.NewLivePoller(
		kc,
		ir,
		cr,
		fr,
		time.Duration(*intervalSec)*time.Second,
	)

	fmt.Println("==================================================================")
	fmt.Println(" GIDH LIVE MARKET DATA ENGINE")
	fmt.Println(" • Universe Scanning: REST Batch Quotes (210 F&O Instruments)")
	fmt.Println(" • Intraday Features: Real-time RVOL, CLV & Official Exchange VWAP")
	fmt.Printf(" • Polling Interval : %d seconds\n", *intervalSec)
	fmt.Println("==================================================================")

	if err := poller.Run(ctx); err != nil && err != context.Canceled {
		log.Fatalf("[LIVE ENGINE ERROR] %v", err)
	}
}
