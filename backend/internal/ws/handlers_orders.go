package ws

import (
	"log"
	"net/http"
)

// HandleOrdersStream handles /v1/stream/orders
func (h *Hub) HandleOrdersStream(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WS Orders] Upgrade error: %v", err)
		return
	}
	defer conn.Close()

	h.mu.Lock()
	h.orderConns[conn] = true
	h.mu.Unlock()

	defer func() {
		h.mu.Lock()
		delete(h.orderConns, conn)
		h.mu.Unlock()
	}()

	_ = conn.WriteJSON(map[string]interface{}{
		"type":    "STATUS",
		"message": "Connected to Orders stream",
	})

	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			break
		}
	}
}

// HandleSectorsStream handles /v1/stream/sectors
func (h *Hub) HandleSectorsStream(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WS Sectors] Upgrade error: %v", err)
		return
	}
	defer conn.Close()

	h.mu.Lock()
	h.sectorConns[conn] = true
	h.mu.Unlock()

	defer func() {
		h.mu.Lock()
		delete(h.sectorConns, conn)
		h.mu.Unlock()
	}()

	_ = conn.WriteJSON(map[string]interface{}{
		"type":    "STATUS",
		"message": "Connected to Sectors stream",
	})

	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			break
		}
	}
}

// HandleLiveOrdersWS for backward compatibility
func (h *Hub) HandleLiveOrdersWS(w http.ResponseWriter, r *http.Request) {
	h.HandleOrdersStream(w, r)
}

// HandleLiveMarketWS for backward compatibility
func (h *Hub) HandleLiveMarketWS(w http.ResponseWriter, r *http.Request) {
	h.HandleRadarStream(w, r)
}

// HandleReplayWS for backward compatibility
func (h *Hub) HandleReplayWS(w http.ResponseWriter, r *http.Request) {
	h.HandleRadarStream(w, r)
}
