package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"gidh-intraday/backend/internal/config"
	"gidh-intraday/backend/internal/marketdata"
	"gidh-intraday/backend/internal/store"
	"gidh-intraday/backend/internal/universe"

	"github.com/redis/go-redis/v9"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("[STREAM SERVICE ERROR] Configuration load error: %v", err)
	}

	if cfg.KiteAPIKey == "" || cfg.KiteAccessToken == "" {
		log.Fatal("[STREAM SERVICE ERROR] KITE_API_KEY and KITE_ACCESS_TOKEN must be set.")
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// 1. Connect to TimescaleDB
	db, err := store.NewDB(ctx, cfg.DBURL)
	if err != nil {
		log.Fatalf("[STREAM SERVICE ERROR] Database connection failed: %v", err)
	}
	defer db.Close()
	log.Println("[STREAM SERVICE] Connected to TimescaleDB.")

	// 2. Connect to Redis
	rdb := redis.NewClient(&redis.Options{
		Addr: cfg.RedisAddr,
	})
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("[STREAM SERVICE WARN] Redis ping warning: %v", err)
	} else {
		log.Println("[STREAM SERVICE] Connected to Redis.")
	}
	defer rdb.Close()

	// 3. Initialize Repositories
	instRepo := store.NewMarketInstrumentRepo(db)
	candleRepo := store.NewMarketCandleRepo(db)
	featureRepo := store.NewDailyFeatureRepo(db)

	// 4. Instantiate UniverseStreamEngine
	engine := marketdata.NewUniverseStreamEngine(
		cfg.KiteAPIKey,
		cfg.KiteAccessToken,
		instRepo,
		candleRepo,
		featureRepo,
	)
	engine.SetRedisClient(rdb)
	engine.SetSectorResolver(universe.ResolveSector)

	// 5. Start Universe Engine
	if err := engine.Start(ctx); err != nil {
		log.Fatalf("[STREAM SERVICE ERROR] Failed to start Universe Stream Engine: %v", err)
	}
	log.Println("🚀 [STREAM SERVICE] Gidh Universe Market Data Engine running.")

	// 6. Graceful Shutdown on SIGINT/SIGTERM
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("[STREAM SERVICE] Stopping Universe Stream Engine...")
	cancel()
	engine.Stop()
	time.Sleep(1 * time.Second)
	log.Println("[STREAM SERVICE] Engine stopped gracefully.")
}
