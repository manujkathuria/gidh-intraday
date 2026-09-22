package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"time"

	"gidh-intraday/backend/internal/config"
	"gidh-intraday/backend/internal/kite"
	"gidh-intraday/backend/internal/store"
	"gidh-intraday/backend/internal/universe"
)

func syncInstruments(args []string) {
	flags := flag.NewFlagSet("instruments sync", flag.ExitOnError)
	expectedCount := flags.Int("expected-count", 212, "required active cash/future pair count")
	_ = flags.Parse(args)

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

	client := kite.NewClient(cfg.KiteAPIKey, cfg.KiteAccessToken)
	instruments, err := client.FetchInstruments(ctx)
	if err != nil {
		log.Fatal(err)
	}
	pairs, err := universe.BuildPairs(instruments, time.Now())
	if err != nil {
		log.Fatal(err)
	}
	if len(pairs) != *expectedCount {
		log.Fatalf("refusing to update universe: expected %d pairs, found %d", *expectedCount, len(pairs))
	}
	if err := store.NewMarketInstrumentRepo(db).ReplaceActiveUniverse(ctx, pairs); err != nil {
		log.Fatal(err)
	}
	fmt.Printf("synced %d active NSE cash / NFO future pairs\n", len(pairs))
}
