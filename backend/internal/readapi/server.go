package readapi

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type Server struct{ reader MarketReader }

func NewServer(reader MarketReader) http.Handler {
	s := &Server{reader: reader}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", s.health)
	mux.HandleFunc("GET /v1/market/universe", s.universe)
	mux.HandleFunc("GET /v1/market/sessions", s.sessions)
	mux.HandleFunc("GET /v1/market/daily-features", s.dailyFeatures)
	mux.HandleFunc("GET /v1/market/intraday-features", s.intradayFeatures)
	return mux
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
