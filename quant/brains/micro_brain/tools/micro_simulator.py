from typing import Dict, Any, List, Optional
from quant.base.db import get_db_connection
from quant.brains.micro_brain.types import MicroTradeDecision, MicroTradeOutcome, MicroOutcomes

def simulate_micro_execution(trade: MicroTradeDecision, session_date: str, start_time: str = "09:31:00", conn=None) -> MicroTradeOutcome:
    """
    Simulates limit order execution and outcome across the remaining session candles (start_time to 15:15).
    """
    close_conn = False
    if conn is None:
        conn = get_db_connection()
        close_conn = True

    try:
        cur = conn.cursor()
        query = """
            SELECT 
                f.ts::time as time,
                f.cash_open,
                f.cash_high,
                f.cash_low,
                f.cash_close
            FROM market.intraday_features_1m f
            JOIN market.instruments i ON f.instrument_id = i.id
            WHERE i.symbol = %s 
              AND f.ts >= (%s || ' ' || %s || '+05:30')::timestamptz
              AND f.ts <= (%s || ' 15:15:00+05:30')::timestamptz
            ORDER BY f.ts ASC;
        """
        cur.execute(query, (trade.symbol, session_date, start_time, session_date))
        bars = cur.fetchall()

        if not bars:
            return MicroTradeOutcome(
                symbol=trade.symbol,
                direction=trade.direction,
                filled=False,
                fill_time=None,
                actual_entry_price=None,
                exit_price=None,
                pnl_pts=0.0,
                pnl_pct=0.0,
                r_multiple_captured=0.0,
                status="MISSED",
                forensics_note="No market bars found for session after start time."
            )

        filled = False
        fill_time = None
        entry_p = trade.target_entry_price
        sl_p = trade.invalidation_price
        t1_p = trade.target_1
        t2_p = trade.target_2
        risk = abs(entry_p - sl_p) if abs(entry_p - sl_p) > 0 else (entry_p * 0.005)

        for bar in bars:
            t, o, h, l, c = bar[0], float(bar[1]), float(bar[2]), float(bar[3]), float(bar[4])

            # 1. Check Fill
            if not filled:
                if trade.direction == "LONG" and l <= entry_p:
                    filled = True
                    fill_time = str(t)
                elif trade.direction == "SHORT" and h >= entry_p:
                    filled = True
                    fill_time = str(t)
                continue

            # 2. If filled, check Stop Loss & Targets
            if trade.direction == "LONG":
                if l <= sl_p:
                    loss_pts = -(entry_p - sl_p)
                    return MicroTradeOutcome(
                        symbol=trade.symbol, direction="LONG", filled=True, fill_time=fill_time,
                        actual_entry_price=entry_p, exit_price=sl_p, pnl_pts=round(loss_pts, 2),
                        pnl_pct=round((loss_pts / entry_p) * 100, 2), r_multiple_captured=-1.0,
                        status="STOPPED_OUT", forensics_note=f"Stopped out at {t} @ ₹{sl_p}"
                    )
                if h >= t1_p:
                    win_pts = t1_p - entry_p
                    r_mult = round(win_pts / risk, 2)
                    return MicroTradeOutcome(
                        symbol=trade.symbol, direction="LONG", filled=True, fill_time=fill_time,
                        actual_entry_price=entry_p, exit_price=t1_p, pnl_pts=round(win_pts, 2),
                        pnl_pct=round((win_pts / entry_p) * 100, 2), r_multiple_captured=r_mult,
                        status="WIN", forensics_note=f"Target 1 hit at {t} @ ₹{t1_p} (+{r_mult}R)"
                    )
            else:  # SHORT
                if h >= sl_p:
                    loss_pts = -(sl_p - entry_p)
                    return MicroTradeOutcome(
                        symbol=trade.symbol, direction="SHORT", filled=True, fill_time=fill_time,
                        actual_entry_price=entry_p, exit_price=sl_p, pnl_pts=round(loss_pts, 2),
                        pnl_pct=round((loss_pts / entry_p) * 100, 2), r_multiple_captured=-1.0,
                        status="STOPPED_OUT", forensics_note=f"Stopped out at {t} @ ₹{sl_p}"
                    )
                if l <= t1_p:
                    win_pts = entry_p - t1_p
                    r_mult = round(win_pts / risk, 2)
                    return MicroTradeOutcome(
                        symbol=trade.symbol, direction="SHORT", filled=True, fill_time=fill_time,
                        actual_entry_price=entry_p, exit_price=t1_p, pnl_pts=round(win_pts, 2),
                        pnl_pct=round((win_pts / entry_p) * 100, 2), r_multiple_captured=r_mult,
                        status="WIN", forensics_note=f"Target 1 hit at {t} @ ₹{t1_p} (+{r_mult}R)"
                    )

        # 3. EOD Close if neither target nor stop hit
        if filled:
            last_c = float(bars[-1][4])
            pnl_pts = (last_c - entry_p) if trade.direction == "LONG" else (entry_p - last_c)
            r_mult = round(pnl_pts / risk, 2)
            status = "WIN" if pnl_pts > 0 else "LOSS"
            return MicroTradeOutcome(
                symbol=trade.symbol, direction=trade.direction, filled=True, fill_time=fill_time,
                actual_entry_price=entry_p, exit_price=last_c, pnl_pts=round(pnl_pts, 2),
                pnl_pct=round((pnl_pts / entry_p) * 100, 2), r_multiple_captured=r_mult,
                status=status, forensics_note=f"EOD 15:15 square-off @ ₹{last_c} ({r_mult}R)"
            )

        return MicroTradeOutcome(
            symbol=trade.symbol, direction=trade.direction, filled=False, fill_time=None,
            actual_entry_price=None, exit_price=None, pnl_pts=0.0, pnl_pct=0.0,
            r_multiple_captured=0.0, status="MISSED", forensics_note="Limit order was not reached by price."
        )
    finally:
        if close_conn:
            conn.close()
