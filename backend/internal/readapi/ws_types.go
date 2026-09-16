package readapi

import (
	"context"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
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
	Type     string                  `json:"type"` // "SNAPSHOT", "CANDLES", "ERROR", "STATUS"
	Time     string                  `json:"time"`
	Snapshot *ReplaySnapshotResponse `json:"snapshot,omitempty"`
	Candles  []ReplayCandle          `json:"candles,omitempty"`
	Error    string                  `json:"error,omitempty"`
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
