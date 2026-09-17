package readapi

import (
	"encoding/json"
	"net/http"
	"time"

	"gidh-intraday/backend/internal/ordermanager"
)

type Server struct {
	reader       MarketReader
	orderManager *ordermanager.Manager
	orderStore   *ordermanager.RedisOrderStore
	wsHub        *ordermanager.WSHub
	liveMarket   *LiveMarketHub
}

func NewServer(reader MarketReader) http.Handler {
	return NewServerWithOrders(reader, nil, nil, nil, nil)
}

func NewServerWithOrders(
	reader MarketReader,
	om *ordermanager.Manager,
	os *ordermanager.RedisOrderStore,
	hub *ordermanager.WSHub,
	liveSource LiveMarketSource,
) http.Handler {
	s := &Server{
		reader:       reader,
		orderManager: om,
		orderStore:   os,
		wsHub:        hub,
		liveMarket:   NewLiveMarketHub(reader, liveSource),
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", s.health)
	mux.HandleFunc("GET /v1/market/universe", s.universe)
	mux.HandleFunc("GET /v1/market/sessions", s.sessions)
	mux.HandleFunc("GET /v1/market/daily-features", s.dailyFeatures)
	mux.HandleFunc("GET /v1/market/intraday-features", s.intradayFeatures)
	mux.HandleFunc("GET /v1/ai/daily-focus", s.dailyFocus)
	mux.HandleFunc("GET /v1/quant/brain-rules", s.quantBrainRules)
	mux.HandleFunc("GET /v1/quant/operating-schedule", s.quantOperatingSchedule)
	mux.HandleFunc("GET /v1/market/macro/futures-inflow", s.futuresInflow)
	mux.HandleFunc("GET /v1/replay/snapshot", s.replaySnapshot)
	mux.HandleFunc("GET /v1/replay/candles", s.replayCandles)
	mux.HandleFunc("GET /v1/replay/ws", s.replayWebSocket)
	mux.HandleFunc("GET /v1/live/market/ws", s.liveMarket.HandleWS)

	// Live Orders & Positions
	mux.HandleFunc("GET /v1/live/orders", s.liveOrders)
	mux.HandleFunc("POST /v1/live/orders", s.createLiveOrder)
	mux.HandleFunc("POST /v1/live/orders/square-off", s.squareOffLiveOrder)
	mux.HandleFunc("GET /v1/live/orders/ws", s.liveOrdersWebSocket)

	authMiddleware := NewAuthMiddleware()
	return withCORS(authMiddleware.WrapHTTP(mux))
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func sessionDate(w http.ResponseWriter, r *http.Request) (string, bool) {
	date := r.URL.Query().Get("session_date")
	if _, err := time.Parse(time.DateOnly, date); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_query", "session_date must be YYYY-MM-DD")
		return "", false
	}
	return date, true
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]any{"error": map[string]string{"code": code, "message": message}})
}
