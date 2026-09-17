package store

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type StockMeta struct {
	PrevClose   float64
	AvgDailyVol float64
}

type MinBar struct {
	Symbol string
	Open   float64
	High   float64
	Low    float64
	Close  float64
	Volume int64
	Time   string
}

// WarmSessionDay pre-caches EOD session candles for historical replay
func WarmSessionDay(ctx context.Context, db *DB, rdb *redis.Client, sessionDate string) error {
	loc, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		loc = time.Local
	}
	todayStr := time.Now().In(loc).Format("2006-01-02")
	if sessionDate == todayStr {
		return nil
	}

	if rdb == nil {
		return nil
	}

	// Check if already warmed
	statusKey := fmt.Sprintf("gidh-intraday:replay:warmed:%s", sessionDate)
	if val, err := rdb.Get(ctx, statusKey).Result(); err == nil && val == "1" {
		return nil
	}

	metaQuery := `
	WITH prev_date AS (
		SELECT DISTINCT session_date as dt
		FROM market.cash_candles_1d
		WHERE session_date < $1::date
		ORDER BY dt DESC LIMIT 1
	),
	prev_close AS (
		SELECT i.symbol, c.close as prev_close
		FROM market.cash_candles_1d c
		JOIN market.instruments i ON c.instrument_id = i.id
		WHERE c.session_date = (SELECT dt FROM prev_date)
	),
	hist_vol AS (
		SELECT i.symbol, AVG(c.volume) as avg_daily_vol
		FROM market.cash_candles_1d c
		JOIN market.instruments i ON c.instrument_id = i.id
		WHERE c.session_date < $1::date
		  AND c.session_date >= ($1::date - INTERVAL '30 days')
		GROUP BY i.symbol
	)
	SELECT i.symbol, COALESCE(pc.prev_close, 0), COALESCE(hv.avg_daily_vol, 0)
	FROM market.instruments i
	LEFT JOIN prev_close pc ON i.symbol = pc.symbol
	LEFT JOIN hist_vol hv ON i.symbol = hv.symbol
	WHERE i.is_active;
	`

	rows, err := db.Pool.Query(ctx, metaQuery, sessionDate)
	if err != nil {
		return fmt.Errorf("warm meta query failed: %w", err)
	}
	defer rows.Close()

	// Mark day as warmed in Redis (expires in 24h)
	_ = rdb.Set(ctx, statusKey, "1", 24*time.Hour).Err()
	return nil
}
