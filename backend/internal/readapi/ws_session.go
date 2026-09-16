package readapi

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

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

func (m *ReplaySessionManager) sendError(code, message string) {
	m.writeMu.Lock()
	_ = m.conn.WriteJSON(WSServerMessage{
		Type:  "ERROR",
		Error: fmt.Sprintf("[%s] %s", code, message),
	})
	m.writeMu.Unlock()
}
