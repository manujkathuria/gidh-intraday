package readapi

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow Next.js localhost and production origins
	},
}

type WSClientMessage struct {
	Action      string `json:"action"`       // "SUBSCRIBE", "PLAY", "PAUSE", "SEEK", "SET_SPEED"
	SessionDate string `json:"session_date"` // YYYY-MM-DD
	Time        string `json:"time"`         // HH:MM:SS
	Speed       int    `json:"speed"`        // 1, 2, 5, 10
	Symbol      string `json:"symbol"`       // e.g. "RELIANCE"
}

type WSServerMessage struct {
	Type     string                   `json:"type"` // "SNAPSHOT", "CANDLES", "ERROR", "STATUS"
	Time     string                   `json:"time"`
	Snapshot *ReplaySnapshotResponse  `json:"snapshot,omitempty"`
	Candles  []ReplayCandle           `json:"candles,omitempty"`
	Error    string                   `json:"error,omitempty"`
}

type ReplaySessionManager struct {
	reader  MarketReader
	conn    *websocket.Conn
	mu      sync.Mutex
	writeMu sync.Mutex

	sessionDate string
	currentMin  int // minutes since midnight (e.g. 555 = 09:15)
	speed       int // multiplier
	isPlaying   bool
	symbol      string

	cancelPlay context.CancelFunc
}

func (s *Server) replayWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WS] Upgrade error: %v", err)
		return
	}
	defer conn.Close()

	mgr := &ReplaySessionManager{
		reader:     s.reader,
		conn:       conn,
		currentMin: 554, // 09:14 pre-open standby default
		speed:      1,
		isPlaying:  false,
		symbol:     "RELIANCE",
	}

	for {
		_, rawMsg, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[WS] Read error: %v", err)
			}
			mgr.stopPlayback()
			break
		}

		var msg WSClientMessage
		if err := json.Unmarshal(rawMsg, &msg); err != nil {
			mgr.sendError("invalid_json", "Failed to parse message")
			continue
		}

		mgr.handleMessage(r.Context(), msg)
	}
}

func (m *ReplaySessionManager) handleMessage(ctx context.Context, msg WSClientMessage) {
	m.mu.Lock()
	defer m.mu.Unlock()

	switch msg.Action {
	case "SUBSCRIBE":
		if msg.SessionDate != "" {
			m.sessionDate = msg.SessionDate
			_ = m.reader.WarmSessionDay(ctx, m.sessionDate)
		}
		if msg.Time != "" {
			m.currentMin = parseTimeToMinutes(msg.Time)
		}
		if msg.Speed > 0 {
			m.speed = msg.Speed
		}
		if msg.Symbol != "" {
			m.symbol = msg.Symbol
		}
		m.sendCurrentFrame(ctx)

	case "SEEK":
		if msg.Time != "" {
			m.currentMin = parseTimeToMinutes(msg.Time)
		}
		m.sendCurrentFrame(ctx)

	case "PLAY":
		if msg.Speed > 0 {
			m.speed = msg.Speed
		}
		if m.sessionDate != "" {
			_ = m.reader.WarmSessionDay(ctx, m.sessionDate)
		}
		m.startPlayback()

	case "PAUSE":
		m.stopPlayback()

	case "SET_SPEED":
		if msg.Speed > 0 {
			m.speed = msg.Speed
			if m.isPlaying {
				m.startPlayback()
			}
		}

	case "SELECT_SYMBOL":
		if msg.Symbol != "" {
			m.symbol = msg.Symbol
			m.sendCandlesFrame(ctx)
		}
	}
}

func (m *ReplaySessionManager) sendCurrentFrame(ctx context.Context) {
	if m.sessionDate == "" {
		return
	}
	timeStr := formatMinutesToString(m.currentMin)
	snapshot, err := m.reader.ReplaySnapshot(ctx, m.sessionDate, timeStr)
	if err != nil {
		m.sendError("query_failed", err.Error())
		return
	}

	res := WSServerMessage{
		Type:     "SNAPSHOT",
		Time:     timeStr,
		Snapshot: snapshot,
	}

	m.writeMu.Lock()
	_ = m.conn.WriteJSON(res)
	m.writeMu.Unlock()

	// Lookahead pre-cache in background: prefetch next 3 minutes into Redis
	if m.isPlaying && m.currentMin < 930 {
		currDate := m.sessionDate
		nextMin := m.currentMin + 1
		go func(date string, min int) {
			for i := 0; i < 3 && (min+i) <= 930; i++ {
				aheadTime := formatMinutesToString(min + i)
				_, _ = m.reader.ReplaySnapshot(context.Background(), date, aheadTime)
			}
		}(currDate, nextMin)
	}
}

func (m *ReplaySessionManager) sendCandlesFrame(ctx context.Context) {
	if m.sessionDate == "" || m.symbol == "" {
		return
	}
	timeStr := formatMinutesToString(m.currentMin)
	candles, err := m.reader.ReplayCandles(ctx, m.sessionDate, m.symbol, timeStr)
	if err != nil {
		return
	}

	res := WSServerMessage{
		Type:    "CANDLES",
		Time:    timeStr,
		Candles: candles,
	}

	m.writeMu.Lock()
	_ = m.conn.WriteJSON(res)
	m.writeMu.Unlock()
}

func (m *ReplaySessionManager) startPlayback() {
	m.stopPlayback()
	m.isPlaying = true

	ctx, cancel := context.WithCancel(context.Background())
	m.cancelPlay = cancel

	delayMs := 1000 / m.speed
	if delayMs < 50 {
		delayMs = 50
	}

	go func() {
		ticker := time.NewTicker(time.Duration(delayMs) * time.Millisecond)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				m.mu.Lock()
				if m.currentMin >= 930 { // 15:30 EOD
					m.isPlaying = false
					m.mu.Unlock()
					return
				}
				m.currentMin++
				m.mu.Unlock()

				m.sendCurrentFrame(ctx)
			}
		}
	}()
}

func (m *ReplaySessionManager) stopPlayback() {
	m.isPlaying = false
	if m.cancelPlay != nil {
		m.cancelPlay()
		m.cancelPlay = nil
	}
}

func (m *ReplaySessionManager) sendError(code, message string) {
	m.writeMu.Lock()
	_ = m.conn.WriteJSON(WSServerMessage{
		Type:  "ERROR",
		Error: fmt.Sprintf("[%s] %s", code, message),
	})
	m.writeMu.Unlock()
}

func parseTimeToMinutes(t string) int {
	var h, min, sec int
	_, _ = fmt.Sscanf(t, "%d:%d:%d", &h, &min, &sec)
	if h == 0 && min == 0 {
		_, _ = fmt.Sscanf(t, "%d:%d", &h, &min)
	}
	total := h*60 + min
	if total < 554 {
		total = 554
	}
	if total > 930 {
		total = 930
	}
	return total
}

func formatMinutesToString(mins int) string {
	h := mins / 60
	m := mins % 60
	return fmt.Sprintf("%02d:%02d:00", h, m)
}
