"""
Gidh Quant Research Engine
Analyzes Top RVOL Bulls & Bears at any timestamp (e.g. 09:20 AM, 10:00 AM, 01:30 PM).
"""

import sys
import psycopg2
from psycopg2.extras import RealDictCursor
import pandas as pd

DB_URL = "postgresql://localhost:5432/gidh_intraday"


def get_rvol_leaderboard(session_date: str = "2026-09-29", time_ist: str = "09:20:00", min_rvol: float = 2.0, limit: int = 15):
    """
    Fetches the market-wide RVOL leaderboard at a specific minute timestamp.
    Classifies stocks as BULLS (Price > VWAP) vs BEARS (Price < VWAP).
    """
    query = """
    SELECT 
        i.symbol,
        ROUND(f.relative_volume::numeric, 2) as rvol,
        ROUND(f.cash_close::numeric, 2) as price,
        ROUND(f.session_vwap::numeric, 2) as vwap,
        ROUND(((f.cash_close - df.prior_close) / df.prior_close * 100)::numeric, 2) as move_pct,
        ROUND(((f.cash_close - f.session_vwap) / f.session_vwap * 100)::numeric, 2) as vwap_dist_pct,
        f.cumulative_volume as cum_vol,
        CASE 
            WHEN f.cash_close >= f.session_vwap AND f.cash_close > df.prior_close THEN 'BULL_LONG'
            WHEN f.cash_close < f.session_vwap AND f.cash_close < df.prior_close THEN 'BEAR_SHORT'
            WHEN f.cash_close >= f.session_vwap AND f.cash_close <= df.prior_close THEN 'PULLBACK_LONG'
            ELSE 'COUNTER_BEAR'
        END as stance
    FROM market.intraday_features_1m f
    JOIN market.instruments i ON f.instrument_id = i.id
    JOIN market.feature_runs fr ON f.feature_run_id = fr.id
    JOIN market.daily_features df ON df.instrument_id = i.id AND df.feature_run_id = fr.id
    WHERE fr.session_date = %s
      AND (f.ts AT TIME ZONE 'Asia/Kolkata')::time = %s
      AND f.relative_volume >= %s
    ORDER BY f.relative_volume DESC NULLS LAST
    LIMIT %s;
    """
    
    conn = psycopg2.connect(DB_URL)
    df = pd.read_sql(query, conn, params=(session_date, time_ist, min_rvol, limit))
    conn.close()
    return df


def track_stock_rvol_curve(symbol: str, session_date: str = "2026-09-29"):
    """
    Tracks RVOL, Price, and VWAP progression minute-by-minute across the entire session.
    """
    query = """
    SELECT 
        (f.ts AT TIME ZONE 'Asia/Kolkata')::time as time_ist,
        ROUND(f.cash_close::numeric, 2) as price,
        ROUND(f.session_vwap::numeric, 2) as vwap,
        ROUND(f.relative_volume::numeric, 2) as rvol,
        f.cumulative_volume,
        ROUND(((f.cash_close - df.prior_close) / df.prior_close * 100)::numeric, 2) as move_pct
    FROM market.intraday_features_1m f
    JOIN market.instruments i ON f.instrument_id = i.id
    JOIN market.feature_runs fr ON f.feature_run_id = fr.id
    JOIN market.daily_features df ON df.instrument_id = i.id AND df.feature_run_id = fr.id
    WHERE fr.session_date = %s
      AND i.symbol = %s
    ORDER BY f.ts ASC;
    """
    conn = psycopg2.connect(DB_URL)
    df = pd.read_sql(query, conn, params=(session_date, symbol))
    conn.close()
    return df


if __name__ == "__main__":
    target_date = sys.argv[1] if len(sys.argv) > 1 else "2026-09-29"
    target_time = sys.argv[2] if len(sys.argv) > 2 else "09:20:00"

    print(f"=== GIDH QUANT: TOP INSTITUTIONAL FOOTPRINTS AT {target_time} ({target_date}) ===")
    df = get_rvol_leaderboard(target_date, target_time)
    print(df.to_string(index=False))
