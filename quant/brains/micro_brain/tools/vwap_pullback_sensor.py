from typing import Dict, Any, Optional
from quant.base.db import get_db_connection
from quant.brains.micro_brain.types import VwapPullbackMetrics

def extract_vwap_pullback_metrics(symbol: str, session_date: str, as_of_time: str = "09:31:00", conn=None) -> VwapPullbackMetrics:
    """
    Extracts real-time VWAP geometry, standard deviation bands, and optimal pullback price levels.
    """
    close_conn = False
    if conn is None:
        conn = get_db_connection()
        close_conn = True

    try:
        cur = conn.cursor()
        query = """
            SELECT 
                f.ts,
                f.cash_close,
                f.session_vwap,
                f.vwap_sigma,
                f.vwap_upper_1,
                f.vwap_lower_1,
                f.vwap_upper_2,
                f.vwap_lower_2,
                f.vwap_distance_sigma
            FROM market.intraday_features_1m f
            JOIN market.instruments i ON f.instrument_id = i.id
            WHERE i.symbol = %s 
              AND f.ts >= (%s || ' 09:15:00+05:30')::timestamptz
              AND f.ts <= (%s || ' ' || %s || '+05:30')::timestamptz
            ORDER BY f.ts ASC;
        """
        cur.execute(query, (symbol, session_date, session_date, as_of_time))
        rows = cur.fetchall()

        if not rows:
            return VwapPullbackMetrics(
                session_vwap=0.0,
                vwap_slope=0.0,
                vwap_distance_sigma=0.0,
                vwap_upper_1=0.0,
                vwap_lower_1=0.0,
                vwap_upper_2=0.0,
                vwap_lower_2=0.0,
                suggested_pullback_price=0.0
            )

        latest = rows[-1]
        first = rows[0]

        cash_close = float(latest[1] or 0)
        session_vwap = float(latest[2] or cash_close)
        vwap_sigma = float(latest[3] or 0)
        vwap_upper_1 = float(latest[4] or session_vwap)
        vwap_lower_1 = float(latest[5] or session_vwap)
        vwap_upper_2 = float(latest[6] or session_vwap)
        vwap_lower_2 = float(latest[7] or session_vwap)
        vwap_dist_sigma = float(latest[8] or 0)

        # VWAP Slope (% change from open to as_of_time)
        first_vwap = float(first[2] or session_vwap)
        vwap_slope = round(((session_vwap - first_vwap) / first_vwap * 100), 3) if first_vwap > 0 else 0.0

        # Suggested pullback price: VWAP level rounded to 0.05
        pullback_price = round(round(session_vwap * 20) / 20, 2)

        return VwapPullbackMetrics(
            session_vwap=round(session_vwap, 2),
            vwap_slope=vwap_slope,
            vwap_distance_sigma=round(vwap_dist_sigma, 2),
            vwap_upper_1=round(vwap_upper_1, 2),
            vwap_lower_1=round(vwap_lower_1, 2),
            vwap_upper_2=round(vwap_upper_2, 2),
            vwap_lower_2=round(vwap_lower_2, 2),
            suggested_pullback_price=pullback_price
        )
    finally:
        if close_conn:
            conn.close()
