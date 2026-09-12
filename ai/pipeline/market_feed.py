"""
Market Feed Pipeline
Extracts 1-minute historical bars, previous day closing baselines, and trading session calendars.
"""

import pandas as pd
from typing import List, Optional
from ai.core.db import get_db_connection

def get_trading_days(limit: int = 60) -> List[str]:
    """Returns sorted list of available historical trading days (YYYY-MM-DD)."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT DISTINCT date(ts AT TIME ZONE 'Asia/Kolkata') as trading_day
        FROM market.cash_candles_1m
        ORDER BY trading_day DESC
        LIMIT %s;
    """, (limit,))
    dates = [str(r[0]) for r in cur.fetchall()]
    conn.close()
    return dates

def get_previous_trading_day(session_date: str) -> str:
    """Returns the immediately preceding trading session date."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT DISTINCT date(ts AT TIME ZONE 'Asia/Kolkata') as trading_day
        FROM market.cash_candles_1m
        WHERE (ts AT TIME ZONE 'Asia/Kolkata')::date < %s
        ORDER BY trading_day DESC
        LIMIT 1;
    """, (session_date,))
    row = cur.fetchone()
    conn.close()
    return str(row[0]) if row else session_date

def fetch_intraday_candles(session_date: str, symbol: Optional[str] = None) -> pd.DataFrame:
    """Pulls 1-minute bar series for a session."""
    conn = get_db_connection()
    cur = conn.cursor()
    if symbol:
        query = """
            SELECT (c.ts AT TIME ZONE 'Asia/Kolkata') as ts, i.symbol, c.open, c.high, c.low, c.close, c.volume
            FROM market.cash_candles_1m c
            JOIN market.instruments i ON c.instrument_id = i.id
            WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = %s AND i.symbol = %s
            ORDER BY c.ts ASC;
        """
        cur.execute(query, (session_date, symbol))
    else:
        query = """
            SELECT (c.ts AT TIME ZONE 'Asia/Kolkata') as ts, i.symbol, c.open, c.high, c.low, c.close, c.volume
            FROM market.cash_candles_1m c
            JOIN market.instruments i ON c.instrument_id = i.id
            WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = %s
            ORDER BY c.ts ASC;
        """
        cur.execute(query, (session_date,))
    cols = [desc[0] for desc in cur.description]
    df = pd.DataFrame(cur.fetchall(), columns=cols)
    conn.close()
    return df
