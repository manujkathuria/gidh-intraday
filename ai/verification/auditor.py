"""
EOD Ground Truth Auditor & Performance Evaluator
"""

import pandas as pd
from ai.core.db import get_db_connection

def audit_session_ground_truth(session_date: str, morning_scout_time: str = "09:30:00") -> pd.DataFrame:
    """
    Evaluates all 210 instruments at 15:15 PM EOD ground truth.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    query = """
    WITH prev_close AS (
        SELECT i.symbol, c.close as prev_close
        FROM market.cash_candles_1m c 
        JOIN market.instruments i ON c.instrument_id = i.id
        WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = (
            SELECT DISTINCT date(ts AT TIME ZONE 'Asia/Kolkata')
            FROM market.cash_candles_1m
            WHERE (ts AT TIME ZONE 'Asia/Kolkata')::date < %s
            ORDER BY date(ts AT TIME ZONE 'Asia/Kolkata') DESC LIMIT 1
        )
          AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time >= '15:29:00'
          AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time <= '15:30:00'
    ),
    morning_price AS (
        SELECT i.symbol,
            (ARRAY_AGG(c.close ORDER BY c.ts DESC))[1] as price_morning
        FROM market.cash_candles_1m c 
        JOIN market.instruments i ON c.instrument_id = i.id
        WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = %s
          AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time <= %s::time
        GROUP BY i.symbol
    ),
    eod_stats AS (
        SELECT i.symbol,
            (ARRAY_AGG(c.close ORDER BY c.ts DESC))[1] as eod_close,
            MAX(c.high) as day_high,
            MIN(c.low) as day_low
        FROM market.cash_candles_1m c 
        JOIN market.instruments i ON c.instrument_id = i.id
        WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = %s
          AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time <= '15:15:00'
        GROUP BY i.symbol
    )
    SELECT 
        e.symbol,
        ROUND(((e.eod_close - p.prev_close) / p.prev_close * 100)::numeric, 2) as full_day_pct,
        ROUND(((e.eod_close - m.price_morning) / m.price_morning * 100)::numeric, 2) as post_scout_return_pct,
        ROUND(((e.day_high - m.price_morning) / m.price_morning * 100)::numeric, 2) as max_mfe_long_pct,
        ROUND(((m.price_morning - e.day_low) / m.price_morning * 100)::numeric, 2) as max_mfe_short_pct
    FROM eod_stats e
    JOIN prev_close p ON e.symbol = p.symbol
    JOIN morning_price m ON e.symbol = m.symbol
    ORDER BY full_day_pct DESC;
    """

    cur.execute(query, (session_date, session_date, morning_scout_time, session_date))
    cols = [desc[0] for desc in cur.description]
    df = pd.DataFrame(cur.fetchall(), columns=cols)
    conn.close()

    for c in ['full_day_pct', 'post_scout_return_pct', 'max_mfe_long_pct', 'max_mfe_short_pct']:
        df[c] = pd.to_numeric(df[c], errors='coerce').fillna(0.0).astype(float)

    return df
