package api

import (
	"encoding/json"
	"net/http"
	"strings"

	edgeauth "gidh-intraday/backend/internal/auth"
)

// Live Positions: GET /api/trading/positions
func (s *Server) HandleLivePositions(w http.ResponseWriter, r *http.Request) {
	if s.orders == nil {
		writeJSON(w, http.StatusOK, []interface{}{})
		return
	}
	positions, err := s.orders.ListPositions(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, positions)
}

// Closed Positions: GET /api/trading/closed-positions?date=YYYY-MM-DD
func (s *Server) HandleClosedPositions(w http.ResponseWriter, r *http.Request) {
	if s.orders == nil {
		writeJSON(w, http.StatusOK, []interface{}{})
		return
	}
	date := r.URL.Query().Get("date")
	closed, err := s.orders.ListClosedPositions(r.Context(), date)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, closed)
}

// Managed Orders: GET /api/trading/orders
func (s *Server) HandleManagedOrders(w http.ResponseWriter, r *http.Request) {
	if s.orders == nil {
		writeJSON(w, http.StatusOK, []interface{}{})
		return
	}
	orders, err := s.orders.ListOrders(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, orders)
}

// Square Off Position: POST /api/trading/positions/:symbol/square-off
func (s *Server) HandleSquareOff(w http.ResponseWriter, r *http.Request) {
	if s.orders == nil {
		writeError(w, http.StatusServiceUnavailable, "order manager is unavailable")
		return
	}
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 4 {
		writeError(w, http.StatusBadRequest, "invalid square off URL path")
		return
	}
	var body struct {
		Reason string `json:"reason"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if body.Reason == "" {
		body.Reason = "MANUAL_SQUARE_OFF"
	}
	order, err := s.orders.SquareOffPosition(r.Context(), parts[3], body.Reason, edgeauth.UserEmail(r.Context()))
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, order)
}

// Update Position Levels: POST /api/trading/positions/:symbol/levels
func (s *Server) HandleUpdateLevels(w http.ResponseWriter, r *http.Request) {
	if s.orders == nil {
		writeError(w, http.StatusServiceUnavailable, "order manager is unavailable")
		return
	}
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 4 {
		writeError(w, http.StatusBadRequest, "invalid levels URL path")
		return
	}
	var body struct {
		StopLossPrice *float64 `json:"stop_loss_price"`
		TargetPrice   *float64 `json:"target_price"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}
	pos, err := s.orders.UpdatePositionLevels(r.Context(), parts[3], body.StopLossPrice, body.TargetPrice)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, pos)
}
