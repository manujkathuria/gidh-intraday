package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"gidh-intraday/backend/internal/api"
	"gidh-intraday/backend/internal/auth"
	"gidh-intraday/backend/internal/broker"
	"gidh-intraday/backend/internal/config"
	"gidh-intraday/backend/internal/marketdata"
	"gidh-intraday/backend/internal/ordermanager"
	"gidh-intraday/backend/internal/store"
	"gidh-intraday/backend/internal/universe"
	"gidh-intraday/backend/internal/ws"

	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
	"github.com/rs/cors"
)

func main() {
	_ = godotenv.Load(".env", "../.env")
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	cfg, err := config.Load()
	if err != nil {
		log.Printf("[CONFIG WARN] %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	db, err := store.NewDB(ctx, cfg.DBURL)
	if err != nil {
		log.Fatalf("[DB FATAL] Failed to connect to TimescaleDB: %v", err)
	}
	defer db.Close()
	log.Println("🐘 [TIMESCALEDB] Connected successfully.")

	rdb := redis.NewClient(&redis.Options{Addr: cfg.RedisAddr})
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("[REDIS WARN] Redis ping warning: %v", err)
	} else {
		log.Println("⚡ [REDIS] Connected successfully.")
	}
	defer rdb.Close()

	if cfg.KiteAPIKey != "" && cfg.KiteAccessToken != "" {
		instRepo := store.NewMarketInstrumentRepo(db)
		candleRepo := store.NewMarketCandleRepo(db)
		featureRepo := store.NewDailyFeatureRepo(db)

		streamEngine := marketdata.NewUniverseStreamEngine(cfg.KiteAPIKey, cfg.KiteAccessToken, instRepo, candleRepo, featureRepo)
		streamEngine.SetRedisClient(rdb)
		streamEngine.SetSectorResolver(universe.ResolveSector)

		if err := streamEngine.Start(ctx); err != nil {
			log.Printf("[STREAM ENGINE WARN] Could not start universe stream: %v", err)
		} else {
			log.Println("📡 [STREAM ENGINE] Live 210-stock Kite data ingestion running.")
			defer streamEngine.Stop()
		}
	}

	var orderManager *ordermanager.Manager
	apiKey := strings.TrimSpace(os.Getenv("KITE_API_KEY"))
	accessToken := strings.TrimSpace(os.Getenv("KITE_ACCESS_TOKEN"))

	if apiKey != "" && accessToken != "" {
		execBroker := broker.NewKite(apiKey, accessToken)
		selectiveTicker := broker.NewSelectiveTicker(apiKey, accessToken)

		orderManager = ordermanager.NewManager(
			execBroker,
			ordermanager.NewStore(rdb),
			ordermanager.NewPostgresInstrumentRepository(db.Pool),
			selectiveTicker,
			ordermanager.Config{Leverage: 5, MaxSlots: 5, LiveExecution: true},
		)
		if err := orderManager.Start(ctx); err != nil {
			log.Printf("[ORDER MANAGER WARN] Disabled: %v", err)
			orderManager = nil
		} else if selectiveTicker != nil {
			selectiveTicker.Start(ctx, orderManager.HandleTick)
			log.Println("🎯 [ORDER MANAGER] Live Zerodha Kite broker & ticker connected.")
		}
	} else {
		log.Println("⚠️ [ORDER MANAGER] KITE_API_KEY/KITE_ACCESS_TOKEN missing. Live trading disabled.")
	}

	authMiddleware, err := auth.New(ctx)
	if err != nil {
		log.Printf("[AUTH WARN] Initializing auth: %v", err)
	}

	mux := http.NewServeMux()
	registerRoutes(mux, api.NewServer(db, rdb, orderManager), ws.NewHub(db, rdb))

	var handler http.Handler = mux
	if authMiddleware != nil {
		handler = authMiddleware.Wrap(mux)
	}

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})
	server := &http.Server{
		Addr:         ":" + port,
		Handler:      c.Handler(handler),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("🦅 [GIDH UNIFIED SERVER] Listening on http://0.0.0.0:%s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[SERVER FATAL] %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("[GIDH UNIFIED SERVER] Shutting down...")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	_ = server.Shutdown(shutdownCtx)
	log.Println("[GIDH UNIFIED SERVER] Stopped cleanly.")
}
