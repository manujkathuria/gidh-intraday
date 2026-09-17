from typing import Dict, Any, Optional
from quant.base.db import get_db_connection
from quant.brains.micro_brain.types import OrbStructureMetrics

def extract_orb_structure_metrics(symbol: str, session_date: str, as_of_time: str = "09:31:00", macro_bias: str = "LONG", conn=None) -> OrbStructureMetrics:
    """
    Extracts 15-minute Opening Range (OR15), bar body/wick rejection, and structural stop levels.
    """
    close_conn = False
    if conn is None:
        conn = get_db_connection()
        close_conn = True

    try:
        cur = conn.cursor()
        query = """
            SELECT 
                f.opening_range_15_high,
                f.opening_range_15_low,
                f.session_range_pct_atr,
                f.upper_wick_pct,
                f.lower_wick_pct,
                f.cash_close,
                df.cpr_bc,
                df.cpr_tc,
                df.atr_14
            FROM market.intraday_features_1m f
            JOIN market.instruments i ON f.instrument_id = i.id
            JOIN market.daily_features df ON df.instrument_id = i.id AND df.feature_run_id = f.feature_run_id
            WHERE i.symbol = %s 
              AND f.ts >= (%s || ' 09:15:00+05:30')::timestamptz
              AND f.ts <= (%s || ' ' || %s || '+05:30')::timestamptz
            ORDER BY f.ts DESC
            LIMIT 1;
        """
        cur.execute(query, (symbol, session_date, session_date, as_of_time))
        row = cur.fetchone()

        if not row:
            return OrbStructureMetrics(
                or15_high=0.0,
                or15_low=0.0,
                or15_midpoint=0.0,
                or15_range_pct_atr=0.0,
                upper_wick_pct=0.0,
                lower_wick_pct=0.0,
                structural_stop_price=0.0
            )

        or15_high = float(row[0] or 0)
        or15_low = float(row[1] or 0)
        range_pct_atr = float(row[2] or 0)
        upper_wick = float(row[3] or 0)
        lower_wick = float(row[4] or 0)
        cash_close = float(row[5] or 0)
        cpr_bc = float(row[6] or 0)
        cpr_tc = float(row[7] or 0)
        atr_14 = float(row[8] or (cash_close * 0.02))

        # Midpoint of OR15
        or15_mid = round((or15_high + or15_low) / 2.0, 2) if or15_high > 0 and or15_low > 0 else cash_close

        # Exact 1.0% MAE Stop Loss (clamped to ₹0.05 tick grid)
        if macro_bias == "LONG":
            stop_price = round(round((cash_close * 0.990) * 20) / 20, 2)
        else:
            stop_price = round(round((cash_close * 1.010) * 20) / 20, 2)

        return OrbStructureMetrics(
            or15_high=round(or15_high, 2),
            or15_low=round(or15_low, 2),
            or15_midpoint=or15_mid,
            or15_range_pct_atr=round(range_pct_atr, 2),
            upper_wick_pct=round(upper_wick, 2),
            lower_wick_pct=round(lower_wick, 2),
            structural_stop_price=stop_price
        )
    finally:
        if close_conn:
            conn.close()
