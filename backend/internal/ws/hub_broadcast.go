package ws

import (
	"encoding/json"

	"github.com/gorilla/websocket"
)

func (h *Hub) broadcastChartFromRadar(payload []byte) {
	var snap struct {
		Stocks []struct {
			Symbol      string  `json:"symbol"`
			Price       float64 `json:"price"`
			VWAP        float64 `json:"vwap"`
			MovePct     float64 `json:"move_pct"`
			GapPct      float64 `json:"gap_pct"`
			RVOL        float64 `json:"rvol"`
			Volume      int64   `json:"volume"`
			IsAboveVWAP bool    `json:"is_above_vwap"`
		} `json:"stocks"`
	}
	if err := json.Unmarshal(payload, &snap); err != nil || len(snap.Stocks) == 0 {
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()
	if len(h.chartConns) == 0 {
		return
	}

	stockMap := make(map[string]interface{}, len(snap.Stocks))
	for _, s := range snap.Stocks {
		stockMap[s.Symbol] = s
	}

	for conn, sym := range h.chartConns {
		if s, exists := stockMap[sym]; exists {
			_ = conn.WriteJSON(s)
		}
	}
}

func (h *Hub) broadcastChartDirect(payload []byte) {
	var tick struct {
		Symbol string `json:"symbol"`
	}
	if err := json.Unmarshal(payload, &tick); err != nil || tick.Symbol == "" {
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()
	for conn, sym := range h.chartConns {
		if sym == tick.Symbol {
			_ = conn.WriteMessage(websocket.TextMessage, payload)
		}
	}
}

func (h *Hub) broadcastRadar(payload []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for conn := range h.radarConns {
		_ = conn.WriteMessage(websocket.TextMessage, payload)
	}
}

func (h *Hub) broadcastOrders(payload []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for conn := range h.orderConns {
		_ = conn.WriteMessage(websocket.TextMessage, payload)
	}
}

func (h *Hub) broadcastSectors(payload []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for conn := range h.sectorConns {
		_ = conn.WriteMessage(websocket.TextMessage, payload)
	}
}
