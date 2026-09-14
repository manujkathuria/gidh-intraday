package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"gidh-intraday/backend/internal/config"
	"gidh-intraday/backend/internal/kite"
	"gidh-intraday/backend/internal/marketdata"
	"gidh-intraday/backend/internal/ordermanager"
	"gidh-intraday/backend/internal/readapi"
	"gidh-intraday/backend/internal/store"

	"github.com/redis/go-redis/v9"
)

func main() {
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

	addr := os.Getenv("GIDH_API_ADDR")
	if addr == "" {
		addr = "127.0.0.1:8080"
	}

	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "127.0.0.1:6379"
	}
	rdb := redis.NewClient(&redis.Options{Addr: redisAddr})

	// Initialize Kite Client & Live Order Components
	cfg, _ := config.LoadData()
	var kc *kite.Client
	var tracker *marketdata.ActivePositionTracker
	if cfg != nil && cfg.KiteAPIKey != "" {
		kc = kite.NewClient(cfg.KiteAPIKey, cfg.KiteAccessToken)
		tracker = marketdata.NewActivePositionTracker(cfg.KiteAPIKey, cfg.KiteAccessToken)
		_ = tracker.Start()
	}

	orderStore := ordermanager.NewRedisOrderStore(rdb)
	ir := store.NewMarketInstrumentRepo(db)
	orderMgr := ordermanager.NewManager(kc, orderStore, ir, tracker, db, false)
	_ = orderMgr.SyncWithZerodha(ctx)

	wsHub := ordermanager.NewWSHub(rdb, orderStore)

	handler := readapi.NewServerWithOrders(
		readapi.NewRepository(db),
		orderMgr,
		orderStore,
		wsHub,
	)

	server := &http.Server{Addr: addr, Handler: handler, ReadHeaderTimeout: 5 * time.Second}
	go func() {
		log.Printf("gidh read & live API listening on http://%s", addr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal(err)
		}
	}()

	signals := make(chan os.Signal, 1)
	signal.Notify(signals, syscall.SIGINT, syscall.SIGTERM)
	<-signals
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("server shutdown: %v", err)
	}
}
