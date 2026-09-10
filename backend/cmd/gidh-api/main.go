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
	"gidh-intraday/backend/internal/readapi"
	"gidh-intraday/backend/internal/store"
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
	server := &http.Server{Addr: addr, Handler: readapi.NewServer(readapi.NewRepository(db)), ReadHeaderTimeout: 5 * time.Second}
	go func() {
		log.Printf("gidh read API listening on http://%s", addr)
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
