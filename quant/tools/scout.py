#!/usr/bin/env python3
"""
Quant Scout / Alert Engine

Surfaces critical 15-minute checkpoint alerts (VWAP breaches, MFE milestones, volume surges)
without making automatic decisions. Acts as a high-speed Heads-Up Display (HUD) for the War Room.

Usage:
  python3 quant/tools/scout.py --day 31 --time 11:30 --positions "MUTHOOTFIN:long:3147.2,SAIL:long:177.6,AMBER:short:7319.0"
  python3 quant/tools/scout.py --day 31 --time 09:45
"""

import argparse
import subprocess
import sys
import json
import re

DEFAULT_CONTAINER = "timescaledb-local"
DEFAULT_DB = "gidh_intraday"
DEFAULT_USER = "postgres"

CHECKPOINT_MINUTES = {
    "09:30": 15,
    "09:45": 30,
    "10:45": 90,
    "11:00": 105,
    "11:30": 135,
    "12:30": 195,
    "14:30": 315,
    "15:15": 359,
    "15:29": 360,
}


def run_sql(query: str, container: str = DEFAULT_CONTAINER, db: str = DEFAULT_DB, user: str = DEFAULT_USER) -> str:
    cmd = [
        "docker", "exec", container,
        "psql", "-U", user, "-d", db, "-P", "pager=off", "-t", "-A", "-c", query
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"Error running SQL: {res.stderr}", file=sys.stderr)
        sys.exit(1)
    return res.stdout.strip()


def get_feature_run(day_num: int):
    offset = day_num - 1
    sql = f"""
    SELECT id, session_date
    FROM market.feature_runs
    ORDER BY session_date ASC
    OFFSET {offset} LIMIT 1;
    """
    out = run_sql(sql)
    if not out:
        print(f"Error: No feature run found for Day {day_num}", file=sys.stderr)
        sys.exit(1)
    parts = out.split("|")
    return parts[0].strip(), parts[1].strip()


def parse_positions(pos_str: str):
    """
    Format: SYMBOL:SIDE:ENTRY_PRICE (e.g. 'MUTHOOTFIN:long:3147.2,AMBER:short:7319.0')
    """
    positions = []
    if not pos_str:
        return positions
    for item in pos_str.split(","):
        parts = item.strip().split(":")
        if len(parts) >= 3:
            positions.append({
                "symbol": parts[0].strip().upper(),
                "side": parts[1].strip().lower(),
                "entry_price": float(parts[2].strip())
            })
    return positions


def main():
    parser = argparse.ArgumentParser(description="Quant Scout / Alert Radar for War Room.")
    parser.add_argument("--day", type=int, required=True, help="Replay Day number (e.g. 31)")
    parser.add_argument("--time", type=str, required=True, choices=list(CHECKPOINT_MINUTES.keys()), help="Checkpoint time")
    parser.add_argument("--positions", type=str, default="", help="Active positions e.g. 'MUTHOOTFIN:long:3147.2,AMBER:short:7319.0'")
    args = parser.parse_args()

    minute = CHECKPOINT_MINUTES[args.time]
    run_id, session_date = get_feature_run(args.day)
    positions = parse_positions(args.positions)

    print("=" * 80)
    print(f"=== QUANT SCOUT RADAR (Day {args.day} [{session_date}] @ {args.time} IST) ===")
    print("=" * 80)

    # 1. Evaluate Active Positions (if provided)
    if positions:
        sym_list = "', '".join([p["symbol"] for p in positions])
        sql = f"""
        SELECT 
            i.symbol,
            f.cash_close,
            f.session_vwap,
            f.relative_volume,
            f.clv
        FROM market.intraday_features_1m f
        JOIN market.instruments i ON f.instrument_id = i.id
        WHERE f.feature_run_id = '{run_id}'::uuid
          AND f.minutes_since_open = {minute}
          AND i.symbol IN ('{sym_list}');
        """
        rows = run_sql(sql)
        price_map = {}
        if rows:
            for line in rows.split("\n"):
                if not line.strip():
                    continue
                parts = line.split("|")
                sym = parts[0].strip()
                price_map[sym] = {
                    "close": float(parts[1]),
                    "vwap": float(parts[2]),
                    "rvol": float(parts[3]) if parts[3] else 0.0,
                    "clv": float(parts[4]) if parts[4] else 0.5,
                }

        print("\n--- ACTIVE POSITION RADAR ---")
        for p in positions:
            sym = p["symbol"]
            side = p["side"]
            entry_px = p["entry_price"]

            if sym not in price_map:
                print(f"[?] {sym} ({side.upper()}): No bar data at {args.time}")
                continue

            data = price_map[sym]
            cur_px = data["close"]
            vwap = data["vwap"]
            rvol = data["rvol"]

            # Return calculation
            if side == "long":
                ret_pct = ((cur_px - entry_px) / entry_px) * 100.0
                vs_vwap = ((cur_px - vwap) / vwap) * 100.0
                vwap_breach = cur_px < vwap
            else:
                ret_pct = ((entry_px - cur_px) / entry_px) * 100.0
                vs_vwap = ((cur_px - vwap) / vwap) * 100.0
                vwap_breach = cur_px > vwap

            # Alert flags
            alerts = []
            status_tag = "[HOLD]"

            if vwap_breach:
                status_tag = "[⚠️ VWAP BREACH]"
                alerts.append(f"Price on wrong side of VWAP ({vs_vwap:+.2f}%)")

            if ret_pct >= 2.5:
                alerts.append("🎯 Milestone +2.5% MFE (Recommend locking +1.0% floor)")
            elif ret_pct >= 1.5:
                alerts.append("🎯 Milestone +1.5% MFE (Recommend locking Breakeven floor)")

            if rvol >= 15.0:
                alerts.append(f"🔥 Tier 1 Institutional Volume ({rvol:.1f}x)")

            alert_str = " | ".join(alerts) if alerts else "Healthy alignment"
            print(f"{status_tag:<18} {sym:<12} ({side.upper()} @ {entry_px:<8.2f}) -> Px: {cur_px:<8.2f} ({ret_pct:+.2f}%) | vs VWAP: {vs_vwap:+.2f}% | RVOL: {rvol:.2f}x | {alert_str}")

    # 2. Market-Wide Outlier Scouts
    print("\n--- MARKET-WIDE MOMENTUM & BREAKDOWN SCOUTS ---")
    outlier_sql = f"""
    SELECT 
        i.symbol,
        f.cash_close,
        f.session_vwap,
        ROUND((((f.cash_close - f.session_open) / f.session_open) * 100.0)::numeric, 2) as ret_from_open,
        ROUND((((f.cash_close - f.session_vwap) / f.session_vwap) * 100.0)::numeric, 2) as vs_vwap,
        ROUND(f.relative_volume::numeric, 2) as rvol,
        ROUND(f.clv::numeric, 2) as clv
    FROM market.intraday_features_1m f
    JOIN market.instruments i ON f.instrument_id = i.id
    WHERE f.feature_run_id = '{run_id}'::uuid
      AND f.minutes_since_open = {minute}
      AND f.relative_volume >= 3.0
    ORDER BY f.relative_volume DESC
    LIMIT 6;
    """
    outliers = run_sql(outlier_sql)
    if outliers:
        for line in outliers.split("\n"):
            if not line.strip():
                continue
            parts = line.split("|")
            sym = parts[0].strip()
            ret_open = float(parts[3])
            vs_vwap = float(parts[4])
            rvol = float(parts[5])
            clv = float(parts[6]) if parts[6] else 0.5

            tag = "🚀 SURGE LONG" if vs_vwap > 0 and ret_open > 0 else "🩸 HEAVY DUMP" if vs_vwap < 0 and ret_open < 0 else "⚡ VOLATILE"
            print(f"[{tag:<12}] {sym:<12} | Open: {ret_open:+.2f}% | vs VWAP: {vs_vwap:+.2f}% | RVOL: {rvol:>5.2f}x | CLV: {clv:.2f}")

    print("=" * 80)


if __name__ == "__main__":
    main()
