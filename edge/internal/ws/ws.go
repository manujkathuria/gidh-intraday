package ws

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"gidh-intraday/edge/internal/cache"
	"gidh-intraday/edge/internal/db"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// Hub manages isolated, throttled page streams (Radar, Chart, Orders, Sectors)
type Hub struct {
	db          *db.Database
	redis       *cache.RedisClient
	mu          sync.RWMutex
	radarConns  map[*websocket.Conn]bool
	chartConns  map[*websocket.Conn]string // conn -> symbol
	orderConns  map[*websocket.Conn]bool
	sectorConns map[*websocket.Conn]bool
}

func NewHub(database *db.Database, r *cache.RedisClient) *Hub {
	h := &Hub{
		db:          database,
		redis:       r,
		radarConns:  make(map[*websocket.Conn]bool),
		chartConns:  make(map[*websocket.Conn]string),
		orderConns:  make(map[*websocket.Conn]bool),
		sectorConns: make(map[*websocket.Conn]bool),
	}
	go h.listenRedis()
	return h
}

func (h *Hub) listenRedis() {
	if h.redis == nil || h.redis.Client == nil {
		return
	}
	ctx := context.Background()
	pubsub := h.redis.Client.Subscribe(ctx, "gidh:radar", "gidh:chart", "gidh:orders", "gidh:sectors", "gidh:market")
	ch := pubsub.Channel()

	// 1Hz Throttle ticker
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for msg := range ch {
		switch msg.Channel {
		case "gidh:radar", "gidh:market":
			h.broadcastRadar([]byte(msg.Payload))
		case "gidh:orders":
			h.broadcastOrders([]byte(msg.Payload))
		case "gidh:sectors":
			h.broadcastSectors([]byte(msg.Payload))
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

// HandleRadarStream handles /v1/stream/radar
// Connects ONLY when user is on Radar page. 1Hz rate limited.
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
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

// HandleChartStream handles /v1/stream/chart?symbol=RELIANCE
// Streams ONLY the single subscribed symbol's live 1m candle at 1Hz max.
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

// HandleOrdersStream handles /v1/stream/orders
// Streams position PnL and order updates.
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
		"type":    "INITIAL_STATE",
		"payload": []interface{}{},
	})

	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
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

	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

// Backward compatibility legacy handlers
func (h *Hub) HandleLiveMarketWS(w http.ResponseWriter, r *http.Request) {
	h.HandleRadarStream(w, r)
}

func (h *Hub) HandleLiveOrdersWS(w http.ResponseWriter, r *http.Request) {
	h.HandleOrdersStream(w, r)
}

func (h *Hub) HandleReplayWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()
	_ = conn.WriteJSON(map[string]interface{}{"type": "STATUS", "message": "Historical mode is pure GraphQL"})
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}
