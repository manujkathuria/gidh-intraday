"""
Market Scouting & Physics Feature Pipeline
Calculates 09:15 Gap, Opening Range, RVOL, VWAP, and CLV across all 210 instruments.
"""

import pandas as pd
import numpy as np
from ai.core.db import get_db_connection
from ai.core.taxonomy import get_sector
from ai.pipeline.market_feed import get_previous_trading_day

def extract_scout_features(session_date: str, time_window: str = "09:30:00") -> pd.DataFrame:
    """
    Extracts all morning quantitative market physics at a given snapshot (e.g. 09:30:00).
    """
    prev_date = get_previous_trading_day(session_date)
    conn = get_db_connection()
    cur = conn.cursor()

    query = """
    WITH prev_close AS (
        SELECT i.symbol, c.close as prev_close
        FROM market.cash_candles_1m c 
        JOIN market.instruments i ON c.instrument_id = i.id
        WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = %s
          AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time >= '15:29:00'
          AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time <= '15:30:00'
    ),
    open_candle AS (
        SELECT i.symbol, MIN(c.open) as day_open
        FROM market.cash_candles_1m c 
        JOIN market.instruments i ON c.instrument_id = i.id
        WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = %s
          AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time >= '09:15:00'
          AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time <= '09:16:00'
        GROUP BY i.symbol
    ),
    morning_bars AS (
        SELECT i.symbol,
            (ARRAY_AGG(c.close ORDER BY c.ts DESC))[1] as current_price,
            SUM(c.volume) as current_vol,
            MIN(c.low) as low_scout,
            MAX(c.high) as high_scout,
            SUM(c.close * c.volume) / NULLIF(SUM(c.volume), 0) as vwap_scout
        FROM market.cash_candles_1m c 
        JOIN market.instruments i ON c.instrument_id = i.id
        WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = %s
          AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time >= '09:15:00'
          AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time <= %s::time
        GROUP BY i.symbol
    ),
    hist_vol AS (
        SELECT i.symbol, AVG(sub.vol_window) as avg_vol_hist
        FROM (
            SELECT instrument_id, date_trunc('day', ts AT TIME ZONE 'Asia/Kolkata') as day, SUM(volume) as vol_window
            FROM market.cash_candles_1m
            WHERE (ts AT TIME ZONE 'Asia/Kolkata')::time >= '09:15:00'
              AND (ts AT TIME ZONE 'Asia/Kolkata')::time <= %s::time
              AND (ts AT TIME ZONE 'Asia/Kolkata')::date < %s
              AND (ts AT TIME ZONE 'Asia/Kolkata')::date >= (%s::date - INTERVAL '30 days')
            GROUP BY instrument_id, date_trunc('day', ts AT TIME ZONE 'Asia/Kolkata')
        ) sub
        JOIN market.instruments i ON sub.instrument_id = i.id
        GROUP BY i.symbol
    )
    SELECT 
        m.symbol,
        ROUND(((o.day_open - p.prev_close) / p.prev_close * 100)::numeric, 2) as gap_pct,
        ROUND(((m.current_price - p.prev_close) / p.prev_close * 100)::numeric, 2) as move_pct,
        ROUND(((m.current_price - m.vwap_scout) / m.vwap_scout * 100)::numeric, 2) as vwap_dist_pct,
        ROUND((m.current_vol / NULLIF(h.avg_vol_hist, 0))::numeric, 2) as rvol,
        ROUND(((m.current_price - m.low_scout) / NULLIF(m.high_scout - m.low_scout, 0))::numeric, 2) as clv,
        m.current_price,
        m.vwap_scout,
        m.current_vol
    FROM morning_bars m
    JOIN prev_close p ON m.symbol = p.symbol
    JOIN open_candle o ON m.symbol = o.symbol
    LEFT JOIN hist_vol h ON m.symbol = h.symbol;
    """

    cur.execute(query, (
        prev_date, session_date,
        session_date, time_window,
        time_window, session_date, session_date
    ))
    cols = [desc[0] for desc in cur.description]
    df = pd.DataFrame(cur.fetchall(), columns=cols)
    conn.close()

    if not df.empty:
        df['sector'] = df['symbol'].apply(get_sector)
        numeric_cols = ['gap_pct', 'move_pct', 'vwap_dist_pct', 'rvol', 'clv', 'current_price', 'vwap_scout', 'current_vol']
        for col in numeric_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0).astype(float)
        df['is_above_vwap'] = df['vwap_dist_pct'] >= 0.0

    return df
