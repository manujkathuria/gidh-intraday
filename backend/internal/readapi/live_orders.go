package readapi

import (
	"encoding/json"
	"net/http"

	"gidh-intraday/backend/internal/ordermanager"
)

func (s *Server) liveOrders(w http.ResponseWriter, r *http.Request) {
	if s.orderManager == nil || s.orderStore == nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"active_positions": []ordermanager.ActivePosition{},
			"total_count":      0,
		})
		return
	}

	positions, err := s.orderStore.GetActivePositions(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	var list []*ordermanager.ActivePosition
	for _, p := range positions {
		list = append(list, p)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"active_positions": list,
		"total_count":      len(list),
	})
}

func (s *Server) createLiveOrder(w http.ResponseWriter, r *http.Request) {
	if s.orderManager == nil {
		writeError(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "Order manager is not initialized")
		return
	}

	var intent ordermanager.OrderIntent
	if err := json.NewDecoder(r.Body).Decode(&intent); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "failed to parse order intent JSON")
		return
	}

	pos, err := s.orderManager.PlaceOrder(r.Context(), intent)
	if err != nil {
		writeError(w, http.StatusBadRequest, "ORDER_REJECTED", err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, pos)
}

func (s *Server) squareOffLiveOrder(w http.ResponseWriter, r *http.Request) {
	if s.orderManager == nil {
		writeError(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "Order manager is not initialized")
		return
	}

	type SquareOffReq struct {
		Symbol string `json:"symbol"`
		Reason string `json:"reason"`
	}

	var req SquareOffReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Symbol == "" {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "symbol is required for square-off")
		return
	}

	if req.Reason == "" {
		req.Reason = "MANUAL_SQUARE_OFF"
	}

	if err := s.orderManager.SquareOffPosition(r.Context(), req.Symbol, req.Reason); err != nil {
		writeError(w, http.StatusBadRequest, "SQUARE_OFF_FAILED", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"symbol": req.Symbol,
		"status": "SQUARED_OFF",
	})
}

func (s *Server) liveOrdersWebSocket(w http.ResponseWriter, r *http.Request) {
	if s.wsHub == nil {
		http.Error(w, "WebSocket hub not initialized", http.StatusServiceUnavailable)
		return
	}
	s.wsHub.HandleWS(w, r)
}
