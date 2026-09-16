package readapi

import (
	"errors"
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
