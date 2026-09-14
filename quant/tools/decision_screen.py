#!/usr/bin/env python3
"""
CLI micro-tool for 09:30 and 09:45 decision screens.

Usage:
  python3 quant/tools/decision_screen.py --day 18 --time 09:30
  python3 quant/tools/decision_screen.py --day 18 --time 09:45
  python3 quant/tools/decision_screen.py --day 18 --time 09:30 --side short
"""

import argparse
import subprocess
import json
import sys

DEFAULT_CONTAINER = "timescaledb-local"
DEFAULT_DB = "gidh_intraday"
DEFAULT_USER = "postgres"


def run_sql(query: str, container: str = DEFAULT_CONTAINER, db: str = DEFAULT_DB, user: str = DEFAULT_USER) -> str:
    cmd = [
        "docker", "exec", container,
        "psql", "-U", user, "-d", db, "-P", "pager=off", "-c", query
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"Error running SQL: {res.stderr}", file=sys.stderr)
        sys.exit(1)
    return res.stdout


def main():
    parser = argparse.ArgumentParser(description="Run Gidh decision screens for a replay day.")
    parser.add_argument("--day", type=int, required=True, help="1-based day index (e.g. 18 for Day 18)")
    parser.add_argument("--time", choices=["09:30", "09:45"], default="09:30", help="Screen checkpoint time")
    parser.add_argument("--side", choices=["long", "short", "both"], default="both", help="Long, short, or both screens")
    parser.add_argument("--min-rvol", type=float, default=2.0, help="Minimum RVOL threshold")
    parser.add_argument("--limit", type=int, default=20, help="Max rows per table")
    args = parser.parse_args()

    offset = args.day - 1
    minute = 15 if args.time == "09:30" else 30
    or_col = "opening_range_15" if minute == 15 else "opening_range_30"

    # 1. Fetch Day Metadata
    meta_sql = f"""
    SELECT id, session_date, expected_instruments, produced_instruments, status
    FROM market.feature_runs
    ORDER BY session_date ASC
    OFFSET {offset}
    LIMIT 1;
    """
    print(f"=== Day {args.day} Feature Run Metadata ===")
    print(run_sql(meta_sql))

    # 2. Long Screen
    if args.side in ("long", "both"):
        long_sql = f"""
        WITH dayn AS (
          SELECT id FROM market.feature_runs ORDER BY session_date ASC OFFSET {offset} LIMIT 1
        ),
        snap AS (
          SELECT
            i.symbol,
            f.cash_close,
            f.session_open,
            f.{or_col}_high AS or_high,
            f.session_vwap,
            f.relative_volume,
            f.clv,
            f.session_range_pct_atr,
            f.oi_change_session,
            ROUND(((f.cash_close-f.session_open)/NULLIF(f.session_open,0)*100)::numeric,2) AS ret_from_open,
            ROUND(((f.cash_close-f.session_vwap)/NULLIF(f.session_vwap,0)*100)::numeric,2) AS vs_vwap,
            ROUND(((f.cash_close-f.{or_col}_high)/NULLIF(f.{or_col}_high,0)*100)::numeric,2) AS vs_or_high
          FROM market.intraday_features_1m f
          JOIN market.instruments i ON i.id=f.instrument_id
          WHERE f.feature_run_id=(SELECT id FROM dayn)
            AND f.minutes_since_open={minute}
        )
        SELECT
          symbol, ret_from_open, vs_vwap, vs_or_high,
          ROUND(relative_volume::numeric,2) AS rvol,
          ROUND(clv::numeric,2) AS clv,
          ROUND(session_range_pct_atr::numeric,2) AS range_atr,
          ROUND(oi_change_session::numeric,2) AS oi_chg
        FROM snap
        WHERE cash_close > session_vwap AND relative_volume >= {args.min_rvol}
        ORDER BY relative_volume DESC, ret_from_open DESC
        LIMIT {args.limit};
        """
        print(f"=== {args.time} LONG Screen (RVOL >= {args.min_rvol}, Above VWAP) ===")
        print(run_sql(long_sql))

    # 3. Short Screen
    if args.side in ("short", "both"):
        short_sql = f"""
        WITH dayn AS (
          SELECT id FROM market.feature_runs ORDER BY session_date ASC OFFSET {offset} LIMIT 1
        ),
        snap AS (
          SELECT
            i.symbol,
            f.cash_close,
            f.session_open,
            f.{or_col}_low AS or_low,
            f.session_vwap,
            f.relative_volume,
            f.clv,
            f.session_range_pct_atr,
            f.oi_change_session,
            ROUND(((f.cash_close-f.session_open)/NULLIF(f.session_open,0)*100)::numeric,2) AS ret_from_open,
            ROUND(((f.cash_close-f.session_vwap)/NULLIF(f.session_vwap,0)*100)::numeric,2) AS vs_vwap,
            ROUND(((f.cash_close-f.{or_col}_low)/NULLIF(f.{or_col}_low,0)*100)::numeric,2) AS vs_or_low
          FROM market.intraday_features_1m f
          JOIN market.instruments i ON i.id=f.instrument_id
          WHERE f.feature_run_id=(SELECT id FROM dayn)
            AND f.minutes_since_open={minute}
        )
        SELECT
          symbol, ret_from_open, vs_vwap, vs_or_low,
          ROUND(relative_volume::numeric,2) AS rvol,
          ROUND(clv::numeric,2) AS clv,
          ROUND(session_range_pct_atr::numeric,2) AS range_atr,
          ROUND(oi_change_session::numeric,2) AS oi_chg
        FROM snap
        WHERE cash_close < session_vwap AND relative_volume >= {args.min_rvol}
        ORDER BY clv ASC, relative_volume DESC
        LIMIT {args.limit};
        """
        print(f"=== {args.time} SHORT Screen (RVOL >= {args.min_rvol}, Below VWAP) ===")
        print(run_sql(short_sql))


if __name__ == "__main__":
    main()
