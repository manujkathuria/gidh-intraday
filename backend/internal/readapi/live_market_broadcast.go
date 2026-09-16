package readapi

import (
	"context"
	"time"
)

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
	if minOfDay < 555 || minOfDay > 930 {
		return "15:30:00"
	}
	return now.Format("15:04:05")
}
