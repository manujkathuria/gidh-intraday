package ws

import (
	"encoding/json"
	"log"
	"net/http"
)

// HandleRadarStream handles /v1/stream/radar (1Hz throttled broadcast).
func (h *Hub) HandleRadarStream(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WS Radar] Upgrade error: %v", err)
		return
	}
	defer conn.Close()

	h.mu.Lock()
	h.radarConns[conn] = true
	h.mu.Unlock()

	defer func() {
		h.mu.Lock()
		delete(h.radarConns, conn)
		h.mu.Unlock()
	}()

	_ = conn.WriteJSON(map[string]interface{}{
		"type":    "STATUS",
		"message": "Connected to Radar 1Hz stream",
	})

	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			break
		}
	}
}

// HandleChartStream handles /v1/stream/chart?symbol=RELIANCE
func (h *Hub) HandleChartStream(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WS Chart] Upgrade error: %v", err)
		return
	}
	defer conn.Close()

	initialSymbol := r.URL.Query().Get("symbol")
	if initialSymbol == "" {
		initialSymbol = "RELIANCE"
	}

	h.mu.Lock()
	h.chartConns[conn] = initialSymbol
	h.mu.Unlock()

	defer func() {
		h.mu.Lock()
		delete(h.chartConns, conn)
		h.mu.Unlock()
	}()

	_ = conn.WriteJSON(map[string]interface{}{
		"type":   "STATUS",
		"symbol": initialSymbol,
	})

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			break
		}
		var req map[string]interface{}
		if err := json.Unmarshal(message, &req); err == nil {
			if req["action"] == "SUBSCRIBE_SYMBOL" {
				if sym, ok := req["symbol"].(string); ok && sym != "" {
					h.mu.Lock()
					h.chartConns[conn] = sym
					h.mu.Unlock()
					_ = conn.WriteJSON(map[string]interface{}{
						"type":   "ACK",
						"symbol": sym,
					})
				}
			}
		}
	}
}
