package readapi

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

func (h *LiveMarketHub) HandleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[LIVE MARKET WS] Upgrade error: %v", err)
		return
	}
	defer conn.Close()

	h.mu.Lock()
	h.clients[conn] = &liveMarketClient{conn: conn, symbol: "RELIANCE", needsCandles: true}
	if !h.started {
		h.started = true
		go h.broadcastLoop()
	}
	h.mu.Unlock()

	defer h.remove(conn)
	h.readLoop(conn)
}

func (h *LiveMarketHub) readLoop(conn *websocket.Conn) {
	for {
		var msg LiveMarketClientMessage
		if err := conn.ReadJSON(&msg); err != nil {
			return
		}
		if msg.Action == "SELECT_SYMBOL" && msg.Symbol != "" {
			h.mu.Lock()
			if client, ok := h.clients[conn]; ok {
				client.symbol = msg.Symbol
				client.lastCandleSignature = ""
				client.needsCandles = true
			}
			h.mu.Unlock()
		}
	}
}

func (h *LiveMarketHub) broadcast(msg LiveMarketServerMessage, match func(*liveMarketClient) bool) {
	h.mu.Lock()
	defer h.mu.Unlock()

	for conn, client := range h.clients {
		if match != nil && !match(client) {
			continue
		}
		if err := conn.WriteJSON(msg); err != nil {
			conn.Close()
			delete(h.clients, conn)
		}
	}
}

func (h *LiveMarketHub) remove(conn *websocket.Conn) {
	h.mu.Lock()
	delete(h.clients, conn)
	h.mu.Unlock()
}
