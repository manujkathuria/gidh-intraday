package api

import (
	"encoding/json"
	"net/http"

	"gidh-intraday/backend/internal/ordermanager"
	"gidh-intraday/backend/internal/store"

	"github.com/redis/go-redis/v9"
)

// Server coordinates HTTP REST endpoints for market data, trading, and macro telemetry.
type Server struct {
	db     *store.DB
	redis  *redis.Client
	orders *ordermanager.Manager
}

// NewServer constructs a new HTTP REST Server adapter.
func NewServer(db *store.DB, r *redis.Client, orders *ordermanager.Manager) *Server {
	return &Server{
		db:     db,
		redis:  r,
		orders: orders,
	}
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
