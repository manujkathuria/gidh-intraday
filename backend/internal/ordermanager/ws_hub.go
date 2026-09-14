package ordermanager

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow localhost and UI origins
	},
}

type WSHub struct {
	redisClient *redis.Client
	store       *RedisOrderStore
	mu          sync.Mutex
	clients     map[*websocket.Conn]bool
}

func NewWSHub(rdb *redis.Client, store *RedisOrderStore) *WSHub {
	hub := &WSHub{
		redisClient: rdb,
		store:       store,
		clients:     make(map[*websocket.Conn]bool),
	}
	if rdb != nil {
		go hub.subscribeRedisEvents()
	}
	return hub
}

func (h *WSHub) HandleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[LIVE ORDER WS] Upgrade error: %v", err)
		return
	}
	defer conn.Close()

	h.mu.Lock()
	h.clients[conn] = true
	h.mu.Unlock()

	defer func() {
		h.mu.Lock()
		delete(h.clients, conn)
		h.mu.Unlock()
	}()

	// Send initial active positions snapshot
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	positions, _ := h.store.GetActivePositions(ctx)
	cancel()

	initialMsg, _ := json.Marshal(LiveEvent{
		Type:      "INITIAL_STATE",
		Timestamp: time.Now(),
		Payload:   positions,
	})
	_ = conn.WriteMessage(websocket.TextMessage, initialMsg)

	// Keep alive reader
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (h *WSHub) subscribeRedisEvents() {
	pubsub := h.redisClient.Subscribe(context.Background(), KeyLiveEvents)
	defer pubsub.Close()

	ch := pubsub.Channel()
	for msg := range ch {
		h.broadcast([]byte(msg.Payload))
	}
}

func (h *WSHub) broadcast(data []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()

	for conn := range h.clients {
		err := conn.WriteMessage(websocket.TextMessage, data)
		if err != nil {
			conn.Close()
			delete(h.clients, conn)
		}
	}
}
