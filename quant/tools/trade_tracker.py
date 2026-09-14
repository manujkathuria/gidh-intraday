#!/usr/bin/env python3
"""
CLI micro-tool for scoring checkpoints and tracking risk metrics for candidate trades.

Usage:
  python3 quant/tools/trade_tracker.py --day 18 --symbols KEI LICI UPL
  python3 quant/tools/trade_tracker.py --day 18 --symbols KEI --pos-value 10000
"""

import argparse
import subprocess
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
    parser = argparse.ArgumentParser(description="Track and score candidate trades across standard checkpoints.")
    parser.add_argument("--day", type=int, required=True, help="1-based day index")
    parser.add_argument("--symbols", nargs="+", required=True, help="List of symbols to track (e.g. KEI LICI UPL)")
    parser.add_argument("--checkpoints", nargs="+", type=int, default=[15, 30, 90, 105, 135, 195, 315, 359, 374],
                        help="Minutes since open (default: 15, 30, 90, 105, 135, 195, 315, 359, 374)")
    parser.add_argument("--pos-value", type=float, default=10000.0, help="Assumed position value in INR (default 10,000)")
    args = parser.parse_args()

    offset = args.day - 1
    sym_list = "'" + "','".join(args.symbols) + "'"
    cp_list = ",".join(map(str, args.checkpoints))

    sql = f"""
    WITH dayn AS (
      SELECT id FROM market.feature_runs ORDER BY session_date ASC OFFSET {offset} LIMIT 1
    ),
    px AS (
      SELECT
        i.symbol,
        f.minutes_since_open,
        f.cash_close,
        f.session_vwap,
        f.relative_volume,
        f.clv,
        ROUND(((f.cash_close-f.session_open)/NULLIF(f.session_open,0)*100)::numeric,2) AS ret_open,
        ROUND(((f.cash_close-f.session_vwap)/NULLIF(f.session_vwap,0)*100)::numeric,2) AS vs_vwap
      FROM market.intraday_features_1m f
      JOIN market.instruments i ON i.id=f.instrument_id
      WHERE f.feature_run_id=(SELECT id FROM dayn)
        AND i.symbol IN ({sym_list})
        AND f.minutes_since_open IN ({cp_list})
    )
    SELECT
      symbol,
      minutes_since_open AS min,
      cash_close AS close,
      ROUND(session_vwap::numeric,2) AS vwap,
      ROUND(relative_volume::numeric,2) AS rvol,
      ROUND(clv::numeric,2) AS clv,
      ret_open,
      vs_vwap
    FROM px
    ORDER BY symbol, minutes_since_open;
    """

    print(f"=== Checkpoint Trajectory for {args.symbols} (Day {args.day}, Base Position: {args.pos_value:,.0f} INR) ===")
    print(run_sql(sql))


if __name__ == "__main__":
    main()
