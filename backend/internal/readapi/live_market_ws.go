package readapi

import (
	"context"
	"errors"
	"log"
	"net/http"
	"sync"
	"time"
)

const liveMarketFPS = time.Second

var errNoLiveSession = errors.New("no live market session available")

type LiveMarketClientMessage struct {
	Action string `json:"action"`
	Symbol string `json:"symbol"`
}

type LiveMarketServerMessage struct {
	Type        string                  `json:"type"`
	SessionDate string                  `json:"session_date,omitempty"`
	Time        string                  `json:"time,omitempty"`
	Snapshot    *ReplaySnapshotResponse `json:"snapshot,omitempty"`
	Candles     []ReplayCandle          `json:"candles,omitempty"`
	Error       string                  `json:"error,omitempty"`
}

type LiveMarketSessionManager struct {
	reader MarketReader
	conn   websocketConn

	mu               sync.RWMutex
	symbol           string
	sessionDate      string
	lastSessionCheck time.Time
}

type websocketConn interface {
	ReadJSON(v any) error
	WriteJSON(v any) error
	Close() error
}

func (s *Server) liveMarketWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[LIVE MARKET WS] Upgrade error: %v", err)
		return
	}
	defer conn.Close()

	mgr := &LiveMarketSessionManager{
		reader: s.reader,
		conn:   conn,
		symbol: "RELIANCE",
	}

	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	go mgr.readLoop(cancel)
	mgr.writeLoop(ctx)
}

func (m *LiveMarketSessionManager) readLoop(cancel context.CancelFunc) {
	defer cancel()
	for {
		var msg LiveMarketClientMessage
		if err := m.conn.ReadJSON(&msg); err != nil {
			return
		}
		if msg.Action == "SELECT_SYMBOL" && msg.Symbol != "" {
			m.mu.Lock()
			m.symbol = msg.Symbol
			m.mu.Unlock()
		}
	}
}

func (m *LiveMarketSessionManager) writeLoop(ctx context.Context) {
	ticker := time.NewTicker(liveMarketFPS)
	defer ticker.Stop()

	m.writeFrame(ctx)
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if !m.writeFrame(ctx) {
				return
			}
		}
	}
}

func (m *LiveMarketSessionManager) writeFrame(ctx context.Context) bool {
	frameCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	sessionDate, timeStr, err := m.currentLiveSession(frameCtx)
	if err != nil {
		return m.writeError(err.Error())
	}

	snapshot, err := m.reader.ReplaySnapshot(frameCtx, sessionDate, timeStr)
	if err != nil {
		return m.writeError(err.Error())
	}
	if err := m.conn.WriteJSON(LiveMarketServerMessage{
		Type:        "MARKET_SNAPSHOT",
		SessionDate: sessionDate,
		Time:        timeStr,
		Snapshot:    snapshot,
	}); err != nil {
		return false
	}

	m.mu.RLock()
	symbol := m.symbol
	m.mu.RUnlock()
	if symbol == "" {
		return true
	}

	candles, err := m.reader.ReplayCandles(frameCtx, sessionDate, symbol, timeStr, "1m")
	if err != nil {
		return true
	}
	if err := m.conn.WriteJSON(LiveMarketServerMessage{
		Type:        "SYMBOL_CANDLES",
		SessionDate: sessionDate,
		Time:        timeStr,
		Candles:     candles,
	}); err != nil {
		return false
	}
	return true
}

func (m *LiveMarketSessionManager) writeError(message string) bool {
	return m.conn.WriteJSON(LiveMarketServerMessage{
		Type:  "ERROR",
		Error: message,
	}) == nil
}

func (m *LiveMarketSessionManager) currentLiveSession(ctx context.Context) (string, string, error) {
	m.mu.RLock()
	sessionDate := m.sessionDate
	lastCheck := m.lastSessionCheck
	m.mu.RUnlock()

	if sessionDate == "" || time.Since(lastCheck) >= time.Minute {
		sessions, err := m.reader.Sessions(ctx)
		if err != nil {
			return "", "", err
		}
		if len(sessions) == 0 {
			return "", "", errNoLiveSession
		}

		sessionDate = sessions[0].Date
		m.mu.Lock()
		m.sessionDate = sessionDate
		m.lastSessionCheck = time.Now()
		m.mu.Unlock()
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
