package readapi

import (
	"context"
	"time"
)

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
	candles, err := m.reader.ReplayCandles(ctx, m.sessionDate, m.symbol, timeStr, "1m")
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
				if m.currentMin >= 930 {
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
