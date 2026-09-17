"""
🏛️ GIDH BRAIN 1 (MACRO SELECTOR): TOOL 1 - FUTURES SENSOR
Extracts raw multi-day Futures Open Interest, Inflows, Price moves, and Notional values.
Zero hardcoded rules. Pure high-fidelity quantitative sensory data.
"""

import pandas as pd
from quant.base.db import get_db_connection

def extract_futures_dynamics(session_date: str, conn=None) -> pd.DataFrame:
    """
    Extracts 1D, 3D, and 5D Futures dynamics for all active F&O instruments on session_date.
    Returns:
      - instrument_id, symbol, fut_close, fut_oi
      - fut_price_1d_pct, fut_oi_1d_pct
      - inflow_1d_cr, inflow_3d_cr, inflow_5d_cr
      - total_notional_cr
    """
    should_close = False
    if conn is None:
        conn = get_db_connection()
        should_close = True

    sql = """
    WITH fut_history AS (
        SELECT 
            fc.instrument_id,
            fc.trading_symbol,
            f1d.session_date,
            f1d.high::float AS fut_high,
            f1d.low::float AS fut_low,
            f1d.close::float AS fut_close,
            f1d.open_interest::float AS fut_oi,
            LAG(f1d.close, 1) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS prev_fut_close,
            LAG(f1d.open_interest, 1) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS prev_fut_oi,
            LAG(f1d.close, 3) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS fut_close_3d_ago,
            LAG(f1d.open_interest, 3) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS fut_oi_3d_ago,
            LAG(f1d.close, 5) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS fut_close_5d_ago,
            LAG(f1d.open_interest, 5) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS fut_oi_5d_ago
        FROM market.future_candles_1d f1d
        JOIN market.future_contracts fc ON f1d.future_contract_id = fc.id
        WHERE f1d.session_date <= %s
    ),
    target_fut AS (
        SELECT DISTINCT ON (instrument_id)
            instrument_id,
            trading_symbol,
            session_date,
            fut_close,
            fut_oi,
            prev_fut_close,
            prev_fut_oi,
            ROUND(((fut_close - prev_fut_close) / NULLIF(prev_fut_close, 0) * 100.0)::numeric, 2) AS fut_price_1d_pct,
            ROUND(((fut_oi - prev_fut_oi) / NULLIF(prev_fut_oi, 0) * 100.0)::numeric, 2) AS fut_oi_1d_pct,
            ROUND(((fut_close - prev_fut_close) * fut_oi / 10000000.0)::numeric, 2) AS inflow_1d_cr,
            ROUND(((fut_close - fut_close_3d_ago) * fut_oi / 10000000.0)::numeric, 2) AS inflow_3d_cr,
            ROUND(((fut_close - fut_close_5d_ago) * fut_oi / 10000000.0)::numeric, 2) AS inflow_5d_cr,
            ROUND((fut_close * fut_oi / 10000000.0)::numeric, 2) AS total_notional_cr
        FROM fut_history
        WHERE session_date = %s
        ORDER BY instrument_id, fut_close DESC
    )
    SELECT 
        i.id AS instrument_id,
        i.symbol,
        tf.fut_close,
        tf.fut_oi,
        tf.fut_price_1d_pct,
        tf.fut_oi_1d_pct,
        COALESCE(tf.inflow_1d_cr, 0.0) AS inflow_1d_cr,
        COALESCE(tf.inflow_3d_cr, 0.0) AS inflow_3d_cr,
        COALESCE(tf.inflow_5d_cr, 0.0) AS inflow_5d_cr,
        COALESCE(tf.total_notional_cr, 0.0) AS total_notional_cr
    FROM target_fut tf
    JOIN market.instruments i ON tf.instrument_id = i.id
    WHERE i.is_active = TRUE;
    """

    df = pd.read_sql(sql, conn, params=(session_date, session_date))
    if should_close:
        conn.close()

    return df
