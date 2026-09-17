from typing import Dict, Any, Optional
from quant.base.db import get_db_connection
from quant.brains.micro_brain.types import OpeningReactionMetrics

def extract_opening_reaction(symbol: str, session_date: str, as_of_time: str = "09:18:00", conn=None) -> OpeningReactionMetrics:
    """
    Extracts initial 3-minute opening print, CPR position, and RVOL surge from market.intraday_features_1m.
    """
    close_conn = False
    if conn is None:
        conn = get_db_connection()
        close_conn = True

    try:
        cur = conn.cursor()
        query = """
            WITH bar_0918 AS (
                SELECT 
                    f.session_open,
                    f.cash_open,
                    f.cash_high,
                    f.cash_low,
                    f.cash_close,
                    f.relative_volume,
                    f.clv,
                    df.prior_close,
                    df.cpr_pivot,
                    df.cpr_bc,
                    df.cpr_tc
                FROM market.intraday_features_1m f
                JOIN market.instruments i ON f.instrument_id = i.id
                JOIN market.daily_features df ON df.instrument_id = i.id AND df.feature_run_id = f.feature_run_id
                WHERE i.symbol = %s 
                  AND f.ts >= (%s || ' 09:15:00+05:30')::timestamptz
                  AND f.ts <= (%s || ' ' || %s || '+05:30')::timestamptz
                ORDER BY f.ts DESC
                LIMIT 1
            )
            SELECT 
                prior_close,
                session_open,
                cash_high,
                cash_low,
                cash_close,
                relative_volume,
                clv,
                cpr_bc,
                cpr_tc
            FROM bar_0918;
        """
        cur.execute(query, (symbol, session_date, session_date, as_of_time))
        row = cur.fetchone()

        if not row:
            return OpeningReactionMetrics(
                opening_gap_pct=0.0,
                session_open=0.0,
                open_cpr_position="INSIDE_CPR",
                open_equals_low=False,
                open_equals_high=False,
                rvol_3m=1.0,
                clv_3m=0.5
            )

        prior_close = float(row[0] or 0)
        session_open = float(row[1] or 0)
        cash_high = float(row[2] or 0)
        cash_low = float(row[3] or 0)
        cash_close = float(row[4] or 0)
        rvol = float(row[5] or 1.0)
        clv = float(row[6] or 0.5)
        cpr_bc = float(row[7] or 0)
        cpr_tc = float(row[8] or 0)

        # Gap %
        gap_pct = round(((session_open - prior_close) / prior_close * 100), 2) if prior_close > 0 else 0.0

        # Open vs CPR Position
        tc = max(cpr_tc, cpr_bc)
        bc = min(cpr_tc, cpr_bc)
        if session_open > tc:
            cpr_pos = "ABOVE_TC"
        elif session_open < bc:
            cpr_pos = "BELOW_BC"
        else:
            cpr_pos = "INSIDE_CPR"

        # Open == Low / High check (within 0.05% tolerance)
        open_eq_low = abs(session_open - cash_low) / session_open <= 0.0005 if session_open > 0 else False
        open_eq_high = abs(session_open - cash_high) / session_open <= 0.0005 if session_open > 0 else False

        return OpeningReactionMetrics(
            opening_gap_pct=gap_pct,
            session_open=round(session_open, 2),
            open_cpr_position=cpr_pos,
            open_equals_low=open_eq_low,
            open_equals_high=open_eq_high,
            rvol_3m=round(rvol, 1),
            clv_3m=round(clv, 2)
        )
    finally:
        if close_conn:
            conn.close()
