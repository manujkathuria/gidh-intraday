package readapi

const replaySnapshotSQL = `
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
open_candle AS (
	SELECT i.symbol, MIN(c.open) as day_open
	FROM market.cash_candles_1m c 
	JOIN market.instruments i ON c.instrument_id = i.id
	WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = $1::date
	  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time >= '09:15:00'
	  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time <= '09:16:00'
	GROUP BY i.symbol
),
current_bars AS (
	SELECT i.symbol,
		(ARRAY_AGG(c.close ORDER BY c.ts DESC))[1] as current_price,
		SUM(c.volume) as current_vol,
		MIN(c.low) as low_scout,
		MAX(c.high) as high_scout,
		SUM(c.close * c.volume) / NULLIF(SUM(c.volume), 0) as vwap_scout
	FROM market.cash_candles_1m c 
	JOIN market.instruments i ON c.instrument_id = i.id
	WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = $1::date
	  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time >= '09:15:00'
	  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time <= $2::time
	GROUP BY i.symbol
),
hist_vol AS (
	SELECT i.symbol, AVG(c.volume) as avg_daily_vol
	FROM market.cash_candles_1d c
	JOIN market.instruments i ON c.instrument_id = i.id
	WHERE c.session_date < $1::date
	  AND c.session_date >= ($1::date - INTERVAL '30 days')
	GROUP BY i.symbol
)
SELECT 
	m.symbol,
	COALESCE(ROUND(((o.day_open - p.prev_close) / p.prev_close * 100)::numeric, 2), 0) as gap_pct,
	COALESCE(ROUND(((m.current_price - p.prev_close) / p.prev_close * 100)::numeric, 2), 0) as move_pct,
	COALESCE(ROUND(((m.current_price - m.vwap_scout) / m.vwap_scout * 100)::numeric, 2), 0) as vwap_dist_pct,
	COALESCE(ROUND((m.current_vol / NULLIF(h.avg_daily_vol, 0) * 100)::numeric, 2), 0) as rvol,
	COALESCE(ROUND(((m.current_price - m.low_scout) / NULLIF(m.high_scout - m.low_scout, 0))::numeric, 2), 0.5) as clv,
	COALESCE(m.current_price, 0),
	COALESCE(m.vwap_scout, 0),
	COALESCE(m.current_vol, 0)
FROM current_bars m
LEFT JOIN prev_close p ON m.symbol = p.symbol
LEFT JOIN open_candle o ON m.symbol = o.symbol
LEFT JOIN hist_vol h ON m.symbol = h.symbol
ORDER BY rvol DESC;
`
