package readapi

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"gidh-intraday/backend/internal/ordermanager"
)

type Server struct {
	reader       MarketReader
	orderManager *ordermanager.Manager
	orderStore   *ordermanager.RedisOrderStore
	wsHub        *ordermanager.WSHub
}

func NewServer(reader MarketReader) http.Handler {
	return NewServerWithOrders(reader, nil, nil, nil)
}

func NewServerWithOrders(
	reader MarketReader,
	om *ordermanager.Manager,
	os *ordermanager.RedisOrderStore,
	hub *ordermanager.WSHub,
) http.Handler {
	s := &Server{
		reader:       reader,
		orderManager: om,
		orderStore:   os,
		wsHub:        hub,
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", s.health)
	mux.HandleFunc("GET /v1/market/universe", s.universe)
	mux.HandleFunc("GET /v1/market/sessions", s.sessions)
	mux.HandleFunc("GET /v1/market/daily-features", s.dailyFeatures)
	mux.HandleFunc("GET /v1/market/intraday-features", s.intradayFeatures)
	mux.HandleFunc("GET /v1/ai/daily-focus", s.dailyFocus)
	mux.HandleFunc("GET /v1/replay/snapshot", s.replaySnapshot)
	mux.HandleFunc("GET /v1/replay/candles", s.replayCandles)
	mux.HandleFunc("GET /v1/replay/ws", s.replayWebSocket)

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

func (s *Server) replaySnapshot(w http.ResponseWriter, r *http.Request) {
	date, ok := sessionDate(w, r)
	if !ok {
		return
	}
	asOfTime := strings.TrimSpace(r.URL.Query().Get("time"))
	if asOfTime == "" {
		asOfTime = "09:30:00"
	}

	snapshot, err := s.reader.ReplaySnapshot(r.Context(), date, asOfTime)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query_failed", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, snapshot)
}

func (s *Server) replayCandles(w http.ResponseWriter, r *http.Request) {
	date, ok := sessionDate(w, r)
	if !ok {
		return
	}
	symbol := strings.TrimSpace(r.URL.Query().Get("symbol"))
	if symbol == "" {
		writeError(w, http.StatusBadRequest, "invalid_query", "symbol is required")
		return
	}
	toTime := strings.TrimSpace(r.URL.Query().Get("to_time"))
	if toTime == "" {
		toTime = "15:30:00"
	}
	interval := strings.TrimSpace(r.URL.Query().Get("interval"))
	if interval == "" {
		interval = "1m"
	}

	candles, err := s.reader.ReplayCandles(r.Context(), date, symbol, toTime, interval)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query_failed", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, candles)
}

func (s *Server) dailyFocus(w http.ResponseWriter, r *http.Request) {
	date, ok := sessionDate(w, r)
	if !ok {
		return
	}
	items, err := s.reader.DailyFocus(r.Context(), date)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query_failed", "AI research data could not be read")
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	if err := s.reader.Ping(r.Context()); err != nil {
		writeError(w, http.StatusServiceUnavailable, "database_unavailable", "database is unavailable")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) universe(w http.ResponseWriter, r *http.Request) {
	items, err := s.reader.Universe(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query_failed", "published market data could not be read")
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) sessions(w http.ResponseWriter, r *http.Request) {
	items, err := s.reader.Sessions(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query_failed", "published market data could not be read")
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) dailyFeatures(w http.ResponseWriter, r *http.Request) {
	date, ok := sessionDate(w, r)
	if !ok {
		return
	}
	items, err := s.reader.DailyFeatures(r.Context(), date)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query_failed", "published market data could not be read")
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) intradayFeatures(w http.ResponseWriter, r *http.Request) {
	date, ok := sessionDate(w, r)
	if !ok {
		return
	}
	symbol := strings.TrimSpace(r.URL.Query().Get("symbol"))
	if symbol == "" {
		writeError(w, http.StatusBadRequest, "invalid_query", "symbol is required")
		return
	}
	limit := 390
	if raw := r.URL.Query().Get("limit"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || value < 1 || value > 500 {
			writeError(w, http.StatusBadRequest, "invalid_query", "limit must be between 1 and 500")
			return
		}
		limit = value
	}
	items, err := s.reader.IntradayFeatures(r.Context(), date, symbol, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query_failed", "published market data could not be read")
		return
	}
	writeJSON(w, http.StatusOK, items)
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
