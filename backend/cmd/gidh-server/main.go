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

	// 1. Connect to TimescaleDB
	db, err := store.NewDB(ctx, cfg.DBURL)
	if err != nil {
		log.Fatalf("[DB FATAL] Failed to connect to TimescaleDB: %v", err)
	}
	defer db.Close()
	log.Println("🐘 [TIMESCALEDB] Connected successfully.")

	// 2. Connect to Redis
	rdb := redis.NewClient(&redis.Options{
		Addr: cfg.RedisAddr,
	})
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("[REDIS WARN] Redis ping warning: %v", err)
	} else {
		log.Println("⚡ [REDIS] Connected successfully.")
	}
	defer rdb.Close()

	// 3. Optional Universe Market Data Streamer (Background Ingestion from Kite)
	if cfg.KiteAPIKey != "" && cfg.KiteAccessToken != "" {
		instRepo := store.NewMarketInstrumentRepo(db)
		candleRepo := store.NewMarketCandleRepo(db)
		featureRepo := store.NewDailyFeatureRepo(db)

		streamEngine := marketdata.NewUniverseStreamEngine(
			cfg.KiteAPIKey,
			cfg.KiteAccessToken,
			instRepo,
			candleRepo,
			featureRepo,
		)
		streamEngine.SetRedisClient(rdb)
		streamEngine.SetSectorResolver(universe.ResolveSector)

		if err := streamEngine.Start(ctx); err != nil {
			log.Printf("[STREAM ENGINE WARN] Could not start universe stream: %v", err)
		} else {
			log.Println("📡 [STREAM ENGINE] Live 210-stock Kite data ingestion running.")
			defer streamEngine.Stop()
		}
	}

	// 4. Initialize Live Zerodha Kite Order Execution Boundary
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

	// 5. Auth Middleware
	authMiddleware, err := auth.New(ctx)
	if err != nil {
		log.Printf("[AUTH WARN] Initializing auth: %v", err)
	}

	// 6. HTTP Router & WebSockets
	mux := http.NewServeMux()
	apiServer := api.NewServer(db, rdb, orderManager)
	wsHub := ws.NewHub(db, rdb)

	// WebSockets
	mux.HandleFunc("/v1/stream/radar", wsHub.HandleRadarStream)
	mux.HandleFunc("/v1/stream/chart", wsHub.HandleChartStream)
	mux.HandleFunc("/v1/stream/orders", wsHub.HandleOrdersStream)
	mux.HandleFunc("/v1/stream/sectors", wsHub.HandleSectorsStream)
	mux.HandleFunc("/v1/live/orders/ws", wsHub.HandleLiveOrdersWS)
	mux.HandleFunc("/v1/live/market/ws", wsHub.HandleLiveMarketWS)
	mux.HandleFunc("/v1/replay/ws", wsHub.HandleReplayWS)

	// REST API Endpoints
	mux.HandleFunc("/api/market/status", apiServer.HandleMarketStatus)
	mux.HandleFunc("/api/market/sessions", apiServer.HandleSessions)
	mux.HandleFunc("/api/market/snapshot", apiServer.HandleMarketSnapshot)
	mux.HandleFunc("/api/market/candles", apiServer.HandleCandles)
	mux.HandleFunc("/api/candles", apiServer.HandleCandles)

	mux.HandleFunc("/api/trading/positions", apiServer.HandleLivePositions)
	mux.HandleFunc("/api/trading/closed-positions", apiServer.HandleClosedPositions)
	mux.HandleFunc("/api/trading/orders", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			apiServer.HandlePlaceOrder(w, r)
		} else {
			apiServer.HandleManagedOrders(w, r)
		}
	})
	mux.HandleFunc("/api/trading/positions/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/square-off") {
			apiServer.HandleSquareOff(w, r)
		} else if strings.HasSuffix(r.URL.Path, "/levels") {
			apiServer.HandleUpdateLevels(w, r)
		} else {
			http.NotFound(w, r)
		}
	})
	mux.HandleFunc("/api/trading/orders/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			apiServer.HandleCancelOrder(w, r)
		} else {
			http.NotFound(w, r)
		}
	})
	mux.HandleFunc("/api/trading/risk-state", apiServer.HandleRiskState)
	mux.HandleFunc("/api/trading/risk-state/reset", apiServer.HandleResetTripwire)
	mux.HandleFunc("/api/macro/brain-sessions", apiServer.HandleBrainSessions)

	// Health check
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok","service":"gidh-server"}`))
	})

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
	handler = c.Handler(handler)

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      handler,
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
