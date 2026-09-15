package readapi

import (
	"context"
	"errors"
	"log"
	"net/http"
	"reflect"
	"strconv"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const liveMarketInterval = time.Second

var errNoLiveSession = errors.New("no live market session available")

type LiveMarketClientMessage struct {
	Action string `json:"action"`
	Symbol string `json:"symbol"`
}

type LiveMarketServerMessage struct {
	Type        string `json:"type"`
	SessionDate string `json:"session_date,omitempty"`
	Time        string `json:"time,omitempty"`
	Snapshot    any    `json:"snapshot,omitempty"`
	Candles     any    `json:"candles,omitempty"`
	Error       string `json:"error,omitempty"`
}

type LiveMarketSource interface {
	LiveSnapshot() (any, bool)
	LiveCandles(symbol string) (any, bool)
}

type liveMarketClient struct {
	conn                *websocket.Conn
	symbol              string
	lastCandleSignature string
	needsCandles        bool
}

type LiveMarketHub struct {
	reader MarketReader
	source LiveMarketSource

	mu               sync.Mutex
	clients          map[*websocket.Conn]*liveMarketClient
	started          bool
	sessionDate      string
	lastSessionCheck time.Time
}

func NewLiveMarketHub(reader MarketReader, source LiveMarketSource) *LiveMarketHub {
	return &LiveMarketHub{
		reader:  reader,
		source:  source,
		clients: make(map[*websocket.Conn]*liveMarketClient),
	}
}

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

func (h *LiveMarketHub) broadcastLoop() {
	ticker := time.NewTicker(liveMarketInterval)
	defer ticker.Stop()

	for range ticker.C {
		if !h.broadcastFrame() {
			return
		}
	}
}

func (h *LiveMarketHub) broadcastFrame() bool {
	h.mu.Lock()
	if len(h.clients) == 0 {
		h.started = false
		h.mu.Unlock()
		return false
	}
	symbols := make(map[string]struct{}, len(h.clients))
	for _, client := range h.clients {
		if client.symbol != "" {
			symbols[client.symbol] = struct{}{}
		}
	}
	h.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	var sessionDate, timeStr string
	var snapshot any
	if h.source != nil {
		if liveSnapshot, ok := h.source.LiveSnapshot(); ok {
			snapshot = liveSnapshot
		}
	}
	if snapshot == nil {
		var err error
		sessionDate, timeStr, err = h.currentLiveSession(ctx)
		if err != nil {
			h.broadcast(LiveMarketServerMessage{Type: "ERROR", Error: err.Error()}, nil)
			return true
		}
		dbSnapshot, err := h.reader.ReplaySnapshot(ctx, sessionDate, timeStr)
		if err != nil {
			h.broadcast(LiveMarketServerMessage{Type: "ERROR", Error: err.Error()}, nil)
			return true
		}
		snapshot = dbSnapshot
	}
	h.broadcast(LiveMarketServerMessage{
		Type:        "MARKET_SNAPSHOT",
		SessionDate: sessionDate,
		Time:        timeStr,
		Snapshot:    snapshot,
	}, nil)

	for symbol := range symbols {
		var candles any
		if h.source != nil {
			if liveCandles, ok := h.source.LiveCandles(symbol); ok {
				candles = liveCandles
			}
		}
		if candles == nil {
			dbCandles, err := h.reader.ReplayCandles(ctx, sessionDate, symbol, timeStr, "1m")
			if err != nil {
				continue
			}
			candles = dbCandles
		}
		h.broadcast(LiveMarketServerMessage{
			Type:        "SYMBOL_CANDLES",
			SessionDate: sessionDate,
			Time:        timeStr,
			Candles:     candles,
		}, func(client *liveMarketClient) bool {
			if client.symbol != symbol {
				return false
			}
			signature := latestCandleSignature(candles)
			if !client.needsCandles && signature == client.lastCandleSignature {
				return false
			}
			client.lastCandleSignature = signature
			client.needsCandles = false
			return true
		})
	}
	return true
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

func (h *LiveMarketHub) currentLiveSession(ctx context.Context) (string, string, error) {
	h.mu.Lock()
	sessionDate := h.sessionDate
	lastCheck := h.lastSessionCheck
	h.mu.Unlock()

	if sessionDate == "" || time.Since(lastCheck) >= time.Minute {
		sessions, err := h.reader.Sessions(ctx)
		if err != nil {
			return "", "", err
		}
		if len(sessions) == 0 {
			return "", "", errNoLiveSession
		}
		sessionDate = sessions[0].Date

		h.mu.Lock()
		h.sessionDate = sessionDate
		h.lastSessionCheck = time.Now()
		h.mu.Unlock()
	}

	return sessionDate, currentISTTime(), nil
}

func currentISTTime() string {
	loc, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		loc = time.Local
	}
	now := time.Now().In(loc)
	minOfDay := now.Hour()*60 + now.Minute()
	if minOfDay < 555 {
		return "09:15:00"
	}
	if minOfDay > 930 {
		return "15:30:00"
	}
	return now.Format("15:04:05")
}

func latestCandleSignature(candles any) string {
	value := reflect.ValueOf(candles)
	if value.Kind() != reflect.Slice || value.Len() == 0 {
		return ""
	}
	last := value.Index(value.Len() - 1)
	if last.Kind() == reflect.Pointer {
		last = last.Elem()
	}
	if last.Kind() != reflect.Struct {
		return ""
	}
	return candleField(last, "Time") + "|" +
		candleField(last, "Open") + "|" +
		candleField(last, "High") + "|" +
		candleField(last, "Low") + "|" +
		candleField(last, "Close") + "|" +
		candleField(last, "Volume") + "|" +
		candleField(last, "VWAP")
}

func candleField(value reflect.Value, name string) string {
	field := value.FieldByName(name)
	if !field.IsValid() {
		return ""
	}
	switch field.Kind() {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return strconv.FormatInt(field.Int(), 10)
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return strconv.FormatUint(field.Uint(), 10)
	case reflect.Float32, reflect.Float64:
		return strconv.FormatFloat(field.Float(), 'f', 4, 64)
	default:
		return ""
	}
}
