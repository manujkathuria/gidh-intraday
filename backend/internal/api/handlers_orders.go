package api

import (
	"encoding/json"
	"net/http"
	"strings"

	edgeauth "gidh-intraday/backend/internal/auth"
	"gidh-intraday/backend/internal/ordermanager"
)

// Place Order: POST /api/trading/orders
func (s *Server) HandlePlaceOrder(w http.ResponseWriter, r *http.Request) {
	if s.orders == nil {
		writeError(w, http.StatusServiceUnavailable, "order manager is unavailable")
		return
	}
	var req struct {
		ClientOrderID    string  `json:"client_order_id"`
		Symbol           string  `json:"symbol"`
		Side             string  `json:"side"`
		OrderType        string  `json:"order_type"`
		TargetEntryPrice float64 `json:"target_entry_price"`
		MarginINR        float64 `json:"margin_inr"`
		Tactic           string  `json:"tactic"`
		Invalidation     string  `json:"invalidation"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.MarginINR <= 0 {
		req.MarginINR = 10000
	}
	if req.Invalidation == "" {
		req.Invalidation = "15M_VWAP_CROSS"
	}
	userEmail := edgeauth.UserEmail(r.Context())
	if userEmail == "" {
		userEmail = "anonymous@gidh.tech"
	}

	if strings.EqualFold(req.OrderType, "LIMIT") {
		if req.TargetEntryPrice <= 0 {
			writeError(w, http.StatusBadRequest, "a positive limit price is required for limit orders")
			return
		}
		order, err := s.orders.PlaceLimitOrder(r.Context(), ordermanager.PlaceLimitInput{
			PlaceMarketInput: ordermanager.PlaceMarketInput{
				ClientOrderID: req.ClientOrderID, Symbol: req.Symbol, Side: ordermanager.TradeSide(req.Side),
				MarginINR: req.MarginINR, Tactic: req.Tactic, Invalidation: req.Invalidation, InitiatedBy: userEmail,
			},
			LimitPrice: req.TargetEntryPrice,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, order)
		return
	}

	order, err := s.orders.PlaceMarketOrder(r.Context(), ordermanager.PlaceMarketInput{
		ClientOrderID: req.ClientOrderID, Symbol: req.Symbol, Side: ordermanager.TradeSide(req.Side),
		MarginINR: req.MarginINR, Tactic: req.Tactic, Invalidation: req.Invalidation, InitiatedBy: userEmail,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, order)
}

// Cancel Limit Order: DELETE /api/trading/orders/:id
func (s *Server) HandleCancelOrder(w http.ResponseWriter, r *http.Request) {
	if s.orders == nil {
		writeError(w, http.StatusServiceUnavailable, "order manager is unavailable")
		return
	}
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 4 {
		writeError(w, http.StatusBadRequest, "order id required")
		return
	}
	order, err := s.orders.CancelLimitOrder(r.Context(), parts[3])
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, order)
}
