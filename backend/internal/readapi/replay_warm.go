package readapi

import (
	"context"
	"time"
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

func (r *Repository) WarmSessionDay(ctx context.Context, sessionDate string) error {
	loc, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		loc = time.Local
	}
	todayStr := time.Now().In(loc).Format("2006-01-02")
	if sessionDate == todayStr {
		return nil
	}

	if r.redis == nil || r.redis.IsDayWarmed(ctx, sessionDate) {
		return nil
	}

	go func() {
		bgCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

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
		SELECT i.symbol, COALESCE(p.prev_close, 0), COALESCE(h.avg_daily_vol, 1)
		FROM market.instruments i
		LEFT JOIN prev_close p ON i.symbol = p.symbol
		LEFT JOIN hist_vol h ON i.symbol = h.symbol
		WHERE i.is_active;
		`

		metaRows, err := r.db.Pool.Query(bgCtx, metaQuery, sessionDate)
		if err != nil {
			return
		}

		stockMetaMap := map[string]StockMeta{}
		for metaRows.Next() {
			var sym string
			var pc, adv float64
			if err := metaRows.Scan(&sym, &pc, &adv); err == nil {
				stockMetaMap[sym] = StockMeta{PrevClose: pc, AvgDailyVol: adv}
			}
		}
		metaRows.Close()

		candlesQuery := `
		SELECT 
			i.symbol, c.open, c.high, c.low, c.close, c.volume,
			to_char(c.ts AT TIME ZONE 'Asia/Kolkata', 'HH24:MI:SS') as candle_time
		FROM market.cash_candles_1m c
		JOIN market.instruments i ON c.instrument_id = i.id
		WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = $1::date
		ORDER BY candle_time ASC, i.symbol ASC;
		`

		cRows, err := r.db.Pool.Query(bgCtx, candlesQuery, sessionDate)
		if err != nil {
			return
		}

		timeGroupedBars := map[string][]MinBar{}
		for cRows.Next() {
			var b MinBar
			if err := cRows.Scan(&b.Symbol, &b.Open, &b.High, &b.Low, &b.Close, &b.Volume, &b.Time); err == nil {
				timeGroupedBars[b.Time] = append(timeGroupedBars[b.Time], b)
			}
		}
		cRows.Close()

		r.processWarmSnapshots(bgCtx, sessionDate, stockMetaMap, timeGroupedBars)
	}()

	return nil
}
