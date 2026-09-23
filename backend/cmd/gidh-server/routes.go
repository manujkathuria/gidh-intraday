package main

import (
	"net/http"
	"strings"

	"gidh-intraday/backend/internal/api"
	"gidh-intraday/backend/internal/ws"
)

func registerRoutes(mux *http.ServeMux, apiServer *api.Server, wsHub *ws.Hub) {
	// WebSockets
	mux.HandleFunc("/v1/stream/radar", wsHub.HandleRadarStream)
	mux.HandleFunc("/v1/stream/chart", wsHub.HandleChartStream)
	mux.HandleFunc("/v1/stream/orders", wsHub.HandleOrdersStream)
	mux.HandleFunc("/v1/stream/sectors", wsHub.HandleSectorsStream)
	mux.HandleFunc("/v1/live/orders/ws", wsHub.HandleLiveOrdersWS)
	mux.HandleFunc("/v1/live/market/ws", wsHub.HandleLiveMarketWS)
	mux.HandleFunc("/v1/replay/ws", wsHub.HandleReplayWS)

	// REST API Endpoints
	mux.HandleFunc("/api/market/status", apiServer.HandleMarketStatus)
	mux.HandleFunc("/api/market/sessions", apiServer.HandleSessions)
	mux.HandleFunc("/api/market/snapshot", apiServer.HandleMarketSnapshot)
	mux.HandleFunc("/api/market/candles", apiServer.HandleCandles)
	mux.HandleFunc("/api/candles", apiServer.HandleCandles)

	mux.HandleFunc("/api/trading/positions", apiServer.HandleLivePositions)
	mux.HandleFunc("/api/trading/closed-positions", apiServer.HandleClosedPositions)
	mux.HandleFunc("/api/trading/orders", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			apiServer.HandlePlaceOrder(w, r)
		} else {
			apiServer.HandleManagedOrders(w, r)
		}
	})
	mux.HandleFunc("/api/trading/positions/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/square-off") {
			apiServer.HandleSquareOff(w, r)
		} else if strings.HasSuffix(r.URL.Path, "/levels") {
			apiServer.HandleUpdateLevels(w, r)
		} else {
			http.NotFound(w, r)
		}
	})
	mux.HandleFunc("/api/trading/orders/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			apiServer.HandleCancelOrder(w, r)
		} else {
			http.NotFound(w, r)
		}
	})
	mux.HandleFunc("/api/trading/risk-state", apiServer.HandleRiskState)
	mux.HandleFunc("/api/trading/risk-state/reset", apiServer.HandleResetTripwire)
	mux.HandleFunc("/api/macro/brain-sessions", apiServer.HandleBrainSessions)

	// Health check
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok","service":"gidh-server"}`))
	})
}
