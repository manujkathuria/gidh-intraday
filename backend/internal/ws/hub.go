package ws

import (
	"context"
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

// Hub manages isolated, throttled page streams (Radar, Chart, Orders, Sectors).
type Hub struct {
	db          *store.DB
	redis       *redis.Client
	mu          sync.RWMutex
	radarConns  map[*websocket.Conn]bool
	chartConns  map[*websocket.Conn]string // conn -> symbol
	orderConns  map[*websocket.Conn]bool
	sectorConns map[*websocket.Conn]bool
}

// NewHub initializes the connection maps and starts Redis subscription loop.
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
