package readapi

import (
	"net/http"
	"strconv"
	"strings"
)

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

func (s *Server) quantBrainRules(w http.ResponseWriter, r *http.Request) {
	rules, err := s.reader.QuantBrainRules(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query_failed", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, rules)
}

func (s *Server) quantOperatingSchedule(w http.ResponseWriter, r *http.Request) {
	schedule, err := s.reader.QuantOperatingSchedule(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query_failed", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, schedule)
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
