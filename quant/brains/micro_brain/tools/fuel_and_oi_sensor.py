from typing import Dict, Any, Optional
from quant.base.db import get_db_connection
from quant.brains.micro_brain.types import FuelAndOiMetrics

def extract_fuel_and_oi_metrics(symbol: str, session_date: str, as_of_time: str = "09:31:00", macro_bias: str = "LONG", conn=None) -> FuelAndOiMetrics:
    """
    Extracts remaining ADR fuel, target potential room, and 15-minute Futures OI build-up.
    """
    close_conn = False
    if conn is None:
        conn = get_db_connection()
        close_conn = True

    try:
        cur = conn.cursor()
        query = """
            SELECT 
                f.adr_fuel_used_pct,
                f.oi_change_15m,
                f.futures_basis_pct,
                f.cash_close,
                df.adr_20,
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
            return FuelAndOiMetrics(
                adr_20_pts=0.0,
                adr_pct=0.0,
                adr_fuel_used_pct=0.0,
                fuel_remaining_pts=0.0,
                remaining_target_price=0.0,
                oi_change_15m=0,
                futures_basis_pct=0.0
            )

        raw_fuel_used = float(row[0] or 0)  # Decimal ratio, e.g. 0.35 = 35%
        oi_change_15m = int(row[1] or 0)
        basis_pct = float(row[2] or 0)
        cash_close = float(row[3] or 0)
        adr_20 = float(row[4] or (cash_close * 0.025))

        adr_pct = round((adr_20 / cash_close * 100), 2) if cash_close > 0 else 0.0
        fuel_used_pct = round(raw_fuel_used * 100.0, 1)
        fuel_remaining_pct = max(0.0, 1.0 - raw_fuel_used)
        fuel_remaining_pts = round(adr_20 * fuel_remaining_pct, 2)

        if macro_bias == "LONG":
            target_price = round(round((cash_close + fuel_remaining_pts) * 20) / 20, 2)
        else:
            target_price = round(round((cash_close - fuel_remaining_pts) * 20) / 20, 2)

        return FuelAndOiMetrics(
            adr_20_pts=round(adr_20, 2),
            adr_pct=adr_pct,
            adr_fuel_used_pct=fuel_used_pct,
            fuel_remaining_pts=fuel_remaining_pts,
            remaining_target_price=target_price,
            oi_change_15m=oi_change_15m,
            futures_basis_pct=round(basis_pct, 4)
        )
    finally:
        if close_conn:
            conn.close()
