package ws

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"

	"gidh-intraday/backend/internal/ordermanager"
	"gidh-intraday/backend/internal/store"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		if origin == "" {
			return true
		}
		allowed := os.Getenv("ALLOWED_ORIGINS")
		if allowed == "" && strings.EqualFold(os.Getenv("ENV"), "production") {
			allowed = "https://gidh.tech,https://www.gidh.tech"
		} else if allowed == "" {
			allowed = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080"
		}
		for _, candidate := range strings.Split(allowed, ",") {
			if origin == strings.TrimSpace(candidate) {
				return true
			}
		}
		return false
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// Hub manages isolated, throttled page streams (Radar, Chart, Orders, Sectors)
type Hub struct {
	db          *store.DB
	redis       *redis.Client
	mu          sync.RWMutex
	radarConns  map[*websocket.Conn]bool
	chartConns  map[*websocket.Conn]string // conn -> symbol
	orderConns  map[*websocket.Conn]bool
	sectorConns map[*websocket.Conn]bool
}

func NewHub(database *store.DB, r *redis.Client) *Hub {
	h := &Hub{
		db:          database,
		redis:       r,
		radarConns:  make(map[*websocket.Conn]bool),
		chartConns:  make(map[*websocket.Conn]string),
		orderConns:  make(map[*websocket.Conn]bool),
		sectorConns: make(map[*websocket.Conn]bool),
	}
	if r != nil {
		go h.listenRedis()
	}
	return h
}

func (h *Hub) listenRedis() {
	if h.redis == nil {
		return
	}
	ctx := context.Background()
	pubsub := h.redis.Subscribe(ctx, "gidh:radar", "gidh:chart", "gidh:orders", "gidh:sectors", "gidh:market", ordermanager.KeyLiveEvents)
	ch := pubsub.Channel()

	for msg := range ch {
		switch msg.Channel {
		case "gidh:radar", "gidh:market":
			payload := []byte(msg.Payload)
			h.broadcastRadar(payload)
			h.broadcastChartFromRadar(payload)
		case "gidh:chart":
			h.broadcastChartDirect([]byte(msg.Payload))
		case "gidh:orders", ordermanager.KeyLiveEvents:
			h.broadcastOrders([]byte(msg.Payload))
		case "gidh:sectors":
			h.broadcastSectors([]byte(msg.Payload))
		}
	}
}

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

// HandleRadarStream handles /v1/stream/radar
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

	_ = conn.WriteJSON(map[string]interface{}{
		"type":    "STATUS",
		"message": "Connected to Sectors stream",
	})

	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
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
