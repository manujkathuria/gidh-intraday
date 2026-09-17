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

	"gidh-intraday/edge/graph"
	"gidh-intraday/edge/graph/generated"
	"gidh-intraday/edge/internal/cache"
	"gidh-intraday/edge/internal/db"
	"gidh-intraday/edge/internal/ws"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gorilla/websocket"
	"github.com/rs/cors"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	ctx := context.Background()

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

	// 3. Setup GraphQL Executable Schema & Handler
	srv := handler.New(generated.NewExecutableSchema(generated.Config{
		Resolvers: &graph.Resolver{
			DB:    database,
			Redis: redisClient,
		},
	}))

	// Support HTTP POST & GET
	srv.AddTransport(transport.POST{})
	srv.AddTransport(transport.GET{})

	// Support Real-Time WebSockets
	srv.AddTransport(transport.Websocket{
		KeepAlivePingInterval: 10 * time.Second,
		Upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
		},
	})

	srv.Use(extension.Introspection{})

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
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization", "X-Requested-With"},
		AllowCredentials: true,
	}).Handler(mux)

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
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = server.Shutdown(shutdownCtx)
}
