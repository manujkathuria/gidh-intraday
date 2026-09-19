package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"gidh-intraday/edge/graph"
	"gidh-intraday/edge/graph/generated"
	edgeauth "gidh-intraday/edge/internal/auth"
	"gidh-intraday/edge/internal/broker"
	"gidh-intraday/edge/internal/cache"
	"gidh-intraday/edge/internal/db"
	"gidh-intraday/edge/internal/ordermanager"
	"gidh-intraday/edge/internal/ws"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
)

func main() {
	// Attempt to load .env from current dir or project root
	_ = godotenv.Load(".env", "../.env")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	ctx, cancelApp := context.WithCancel(context.Background())
	defer cancelApp()
	origins := configuredOrigins()
	authMiddleware, err := edgeauth.New(ctx)
	if err != nil {
		log.Fatalf("initialize authentication: %v", err)
	}

	// 1. Connect to TimescaleDB
	database, err := db.Connect(ctx)
	if err != nil {
		log.Printf("[EDGE DB WARN] Database connection failed: %v", err)
	} else {
		log.Println("[EDGE DB] Connected to TimescaleDB.")
		defer database.Close()
	}

	// 2. Connect to Redis
	redisClient := cache.Connect(ctx)
	log.Println("[EDGE CACHE] Redis initialized.")
	defer redisClient.Close()

	// 3. Initialize the single edge-owned order execution boundary.
	var orderManager *ordermanager.Manager
	liveExecution := strings.EqualFold(os.Getenv("ORDER_LIVE_ENABLED"), "true")
	if database != nil && database.Pool != nil && redisClient != nil && redisClient.Client != nil {
		var executionBroker broker.Broker = broker.NewPaper()
		apiKey := strings.TrimSpace(os.Getenv("KITE_API_KEY"))
		accessToken := strings.TrimSpace(os.Getenv("KITE_ACCESS_TOKEN"))
		if liveExecution {
			if apiKey == "" || accessToken == "" {
				log.Fatal("ORDER_LIVE_ENABLED=true requires KITE_API_KEY and KITE_ACCESS_TOKEN")
			}
			executionBroker = broker.NewKite(apiKey, accessToken)
		}

		var selectiveTicker *broker.SelectiveTicker
		if apiKey != "" && accessToken != "" {
			selectiveTicker = broker.NewSelectiveTicker(apiKey, accessToken)
		}
		orderManager = ordermanager.NewManager(
			executionBroker,
			ordermanager.NewStore(redisClient.Client),
			ordermanager.NewPostgresInstrumentRepository(database.Pool),
			selectiveTicker,
			ordermanager.Config{Leverage: 5, MaxSlots: 5, LiveExecution: liveExecution},
		)
		if err := orderManager.Start(ctx); err != nil {
			log.Printf("[ORDER MANAGER WARN] disabled: %v", err)
			orderManager = nil
		} else if selectiveTicker != nil {
			selectiveTicker.Start(ctx, orderManager.HandleTick)
		}
		if liveExecution {
			log.Println("[ORDER MANAGER] LIVE execution enabled")
		} else {
			log.Println("[ORDER MANAGER] paper execution enabled")
		}
	}

	// 4. Setup GraphQL Executable Schema & Handler
	srv := handler.New(generated.NewExecutableSchema(generated.Config{
		Resolvers: &graph.Resolver{
			DB:     database,
			Redis:  redisClient,
			Orders: orderManager,
		},
	}))

	// Support HTTP POST & GET
	srv.AddTransport(transport.POST{})
	srv.AddTransport(transport.GET{})

	// Support Real-Time WebSockets
	srv.AddTransport(transport.Websocket{
		KeepAlivePingInterval: 10 * time.Second,
		Upgrader: websocket.Upgrader{
			CheckOrigin:     func(r *http.Request) bool { return originAllowed(r, origins) },
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
		},
	})

	if !strings.EqualFold(os.Getenv("ENV"), "production") {
		srv.Use(extension.Introspection{})
	}

	// 4. Setup Routes & CORS
	mux := http.NewServeMux()

	// WebSocket Hub for live & on-demand streams
	wsHub := ws.NewHub(database, redisClient)
	mux.HandleFunc("/v1/stream/radar", wsHub.HandleRadarStream)
	mux.HandleFunc("/v1/stream/chart", wsHub.HandleChartStream)
	mux.HandleFunc("/v1/stream/orders", wsHub.HandleOrdersStream)
	mux.HandleFunc("/v1/stream/sectors", wsHub.HandleSectorsStream)

	// Backward compatibility legacy routes
	mux.HandleFunc("/v1/live/orders/ws", wsHub.HandleLiveOrdersWS)
	mux.HandleFunc("/v1/live/market/ws", wsHub.HandleLiveMarketWS)
	mux.HandleFunc("/v1/replay/ws", wsHub.HandleReplayWS)

	// Interactive GraphQL Playground on GET /
	mux.Handle("/", playground.Handler("Gidh Edge GraphQL Playground", "/graphql"))

	// Unified GraphQL Query & Subscription Endpoint
	mux.Handle("/graphql", srv)

	// Lightweight Health Check
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok","service":"gidh-edge"}`))
	})

	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   origins,
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization", "X-Requested-With"},
		AllowCredentials: true,
	}).Handler(authMiddleware.Wrap(mux))

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           corsHandler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Printf("🚀 Gidh Edge GraphQL Service listening on http://localhost:%s/", port)
		log.Printf("📡 GraphQL Endpoint: http://localhost:%s/graphql", port)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server failed: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down Gidh Edge service...")
	cancelApp()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = server.Shutdown(shutdownCtx)
}

func configuredOrigins() []string {
	if raw := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS")); raw != "" {
		parts := strings.Split(raw, ",")
		result := make([]string, 0, len(parts))
		for _, part := range parts {
			if origin := strings.TrimSpace(part); origin != "" {
				result = append(result, origin)
			}
		}
		return result
	}
	if strings.EqualFold(os.Getenv("ENV"), "production") {
		return []string{"https://gidh.tech", "https://www.gidh.tech"}
	}
	return []string{"http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8080", "http://127.0.0.1:8080"}
}

func originAllowed(r *http.Request, allowed []string) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return true
	}
	for _, candidate := range allowed {
		if origin == candidate {
			return true
		}
	}
	return false
}
