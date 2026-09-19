"""
🏛️ GIDH BRAIN 1 (MACRO SELECTOR): TOOL 2 - STRUCTURE SENSOR
Extracts raw daily structural levels: CPR width %, 20/50/200 SMAs, 20D Proximity, ADR, and Fuel.
Zero hardcoded rules. Pure quantitative structure.
"""

import pandas as pd
from quant.base.db import get_db_connection

def extract_structure_dynamics(session_date: str, conn=None) -> pd.DataFrame:
    """
    Extracts daily structural features and volatility fuel metrics for all active F&O instruments on session_date.
    Returns:
      - instrument_id, symbol, prior_close, prior_high, prior_low
      - cpr_pivot, cpr_bc, cpr_tc, cpr_width_pct
      - adr_20, adr_pct, atr_14, atr_pct
      - sma_20, sma_50, sma_200
      - return_5d_pct, return_20d_pct, distance_20d_high_pct, distance_20d_low_pct
      - average_daily_volume_20, volume_dryup_ratio
      - high_3d, low_3d, range_3d, fuel_pct
    """
    should_close = False
    if conn is None:
        conn = get_db_connection()
        should_close = True

    sql = """
    WITH sma200_calc AS (
        SELECT 
            instrument_id,
            AVG(close) AS sma_200
        FROM (
            SELECT 
                instrument_id,
                close,
                ROW_NUMBER() OVER (PARTITION BY instrument_id ORDER BY session_date DESC) as rn
            FROM market.cash_candles_1d
            WHERE session_date <= %s
        ) sub
        WHERE rn <= 200
        GROUP BY instrument_id
        HAVING COUNT(*) >= 30
    ),
    cash_3d AS (
        SELECT 
            instrument_id,
            MAX(high) AS high_3d,
            MIN(low) AS low_3d
        FROM (
            SELECT 
                instrument_id,
                high,
                low,
                ROW_NUMBER() OVER (PARTITION BY instrument_id ORDER BY session_date DESC) as rn
            FROM market.cash_candles_1d
            WHERE session_date <= %s
        ) sub
        WHERE rn <= 3
        GROUP BY instrument_id
    )
    SELECT 
        i.id AS instrument_id,
        i.symbol,
        df.prior_close,
        df.prior_high,
        df.prior_low,
        df.prior_week_high,
        df.prior_week_low,
        df.cpr_pivot,
        df.cpr_bc,
        df.cpr_tc,
        ROUND((ABS(df.cpr_tc - df.cpr_bc) / NULLIF(df.cpr_pivot, 0) * 100.0)::numeric, 3) AS cpr_width_pct,
        df.adr_20,
        ROUND((df.adr_20 / NULLIF(df.prior_close, 0) * 100.0)::numeric, 2) AS adr_pct,
        df.atr_14,
        ROUND((df.atr_14 / NULLIF(df.prior_close, 0) * 100.0)::numeric, 2) AS atr_pct,
        df.sma_20,
        df.sma_50,
        ROUND(s200.sma_200::numeric, 2) AS sma_200,
        df.return_5d_pct,
        df.return_20d_pct,
        df.distance_20d_high_pct,
        df.distance_20d_low_pct,
        df.average_daily_volume_20,
        df.volume_dryup_ratio,
        c3.high_3d,
        c3.low_3d,
        (c3.high_3d - c3.low_3d) AS range_3d,
        ROUND(GREATEST(0.0, 100.0 - (((c3.high_3d - c3.low_3d) / NULLIF(2.5 * df.adr_20, 0)) * 100.0))::numeric, 1) AS fuel_pct
    FROM market.feature_runs fr
    JOIN market.daily_features df ON df.feature_run_id = fr.id
    JOIN market.instruments i ON df.instrument_id = i.id
    LEFT JOIN sma200_calc s200 ON df.instrument_id = s200.instrument_id
    LEFT JOIN cash_3d c3 ON df.instrument_id = c3.instrument_id
    WHERE fr.session_date = %s
      AND fr.status = 'SUCCEEDED'
      AND i.is_active = TRUE
      AND df.prior_close >= 300.0
      AND df.prior_close <= 7000.0;
    """

    df = pd.read_sql(sql, conn, params=(session_date, session_date, session_date))
    if should_close:
        conn.close()

    return df
