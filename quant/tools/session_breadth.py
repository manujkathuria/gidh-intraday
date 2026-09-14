#!/usr/bin/env python3
"""
CLI micro-tool for computing full-day market breadth, top winners, and top losers.

Usage:
  python3 quant/tools/session_breadth.py --day 18
  python3 quant/tools/session_breadth.py --day 18 --top 15
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
    parser = argparse.ArgumentParser(description="Compute full-session breadth and top movers for a replay day.")
    parser.add_argument("--day", type=int, required=True, help="1-based day index")
    parser.add_argument("--top", type=int, default=10, help="Number of top winners / losers to display")
    args = parser.parse_args()

    offset = args.day - 1

    sql = f"""
    WITH dayn AS (
      SELECT id FROM market.feature_runs ORDER BY session_date ASC OFFSET {offset} LIMIT 1
    ),
    maxm AS (
      SELECT feature_run_id, instrument_id, MAX(minutes_since_open) AS max_minute
      FROM market.intraday_features_1m
      WHERE feature_run_id=(SELECT id FROM dayn)
      GROUP BY feature_run_id, instrument_id
    ),
    per_inst AS (
      SELECT
        i.symbol,
        MAX(f.cash_open) FILTER (WHERE f.minutes_since_open=0) AS first_open,
        MAX(f.cash_close) FILTER (WHERE f.minutes_since_open=29) AS close_30m,
        MAX(f.cash_close) FILTER (WHERE f.minutes_since_open=m.max_minute) AS last_close,
        MAX(f.session_vwap) FILTER (WHERE f.minutes_since_open=m.max_minute) AS final_vwap,
        MAX(f.relative_volume) FILTER (WHERE f.minutes_since_open=m.max_minute) AS final_rvol,
        MAX(f.cash_high) AS day_high,
        MIN(f.cash_low) AS day_low
      FROM market.intraday_features_1m f
      JOIN maxm m ON m.feature_run_id=f.feature_run_id AND m.instrument_id=f.instrument_id
      JOIN market.instruments i ON i.id=f.instrument_id
      GROUP BY i.symbol
    ),
    scored AS (
      SELECT *,
        ROUND(((last_close-first_open)/NULLIF(first_open,0)*100)::numeric,2) AS day_return_pct,
        ROUND(((close_30m-first_open)/NULLIF(first_open,0)*100)::numeric,2) AS first30_return_pct,
        ROUND(((last_close-close_30m)/NULLIF(close_30m,0)*100)::numeric,2) AS after30_return_pct,
        ROUND(((last_close-final_vwap)/NULLIF(final_vwap,0)*100)::numeric,2) AS close_vs_vwap_pct,
        ROUND(((day_high-day_low)/NULLIF(first_open,0)*100)::numeric,2) AS intraday_range_pct
      FROM per_inst
    )
    SELECT
      COUNT(*) AS n,
      COUNT(*) FILTER (WHERE day_return_pct > 0) AS green,
      COUNT(*) FILTER (WHERE day_return_pct < 0) AS red,
      COUNT(*) FILTER (WHERE close_vs_vwap_pct > 0) AS above_vwap,
      COUNT(*) FILTER (WHERE close_vs_vwap_pct < 0) AS below_vwap,
      COUNT(*) FILTER (WHERE final_rvol >= 2) AS rvol_2x,
      COUNT(*) FILTER (WHERE final_rvol >= 4) AS rvol_4x,
      ROUND(AVG(day_return_pct)::numeric,2) AS avg_ret,
      ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY day_return_pct)::numeric,2) AS median_ret
    FROM scored;
    """

    movers_sql = f"""
    WITH dayn AS (
      SELECT id FROM market.feature_runs ORDER BY session_date ASC OFFSET {offset} LIMIT 1
    ),
    maxm AS (
      SELECT feature_run_id, instrument_id, MAX(minutes_since_open) AS max_minute
      FROM market.intraday_features_1m
      WHERE feature_run_id=(SELECT id FROM dayn)
      GROUP BY feature_run_id, instrument_id
    ),
    per_inst AS (
      SELECT
        i.symbol,
        MAX(f.cash_open) FILTER (WHERE f.minutes_since_open=0) AS first_open,
        MAX(f.cash_close) FILTER (WHERE f.minutes_since_open=29) AS close_30m,
        MAX(f.cash_close) FILTER (WHERE f.minutes_since_open=m.max_minute) AS last_close,
        MAX(f.session_vwap) FILTER (WHERE f.minutes_since_open=m.max_minute) AS final_vwap,
        MAX(f.relative_volume) FILTER (WHERE f.minutes_since_open=m.max_minute) AS final_rvol,
        MAX(f.cash_high) AS day_high,
        MIN(f.cash_low) AS day_low
      FROM market.intraday_features_1m f
      JOIN maxm m ON m.feature_run_id=f.feature_run_id AND m.instrument_id=f.instrument_id
      JOIN market.instruments i ON i.id=f.instrument_id
      GROUP BY i.symbol
    ),
    scored AS (
      SELECT *,
        ROUND(((last_close-first_open)/NULLIF(first_open,0)*100)::numeric,2) AS day_return_pct,
        ROUND(((close_30m-first_open)/NULLIF(first_open,0)*100)::numeric,2) AS first30_return_pct,
        ROUND(((last_close-close_30m)/NULLIF(close_30m,0)*100)::numeric,2) AS after30_return_pct,
        ROUND(((last_close-final_vwap)/NULLIF(final_vwap,0)*100)::numeric,2) AS close_vs_vwap_pct,
        ROUND(((day_high-day_low)/NULLIF(first_open,0)*100)::numeric,2) AS intraday_range_pct
      FROM per_inst
    )
    (SELECT 'WINNER' AS type, symbol, day_return_pct, first30_return_pct, after30_return_pct, close_vs_vwap_pct, final_rvol
     FROM scored
     ORDER BY day_return_pct DESC
     LIMIT {args.top})
    UNION ALL
    (SELECT 'LOSER' AS type, symbol, day_return_pct, first30_return_pct, after30_return_pct, close_vs_vwap_pct, final_rvol
     FROM scored
     ORDER BY day_return_pct ASC
     LIMIT {args.top});
    """

    print(f"=== Full-Day Breadth (Day {args.day}) ===")
    print(run_sql(sql))
    print(f"=== Top {args.top} Movers (Day {args.day}) ===")
    print(run_sql(movers_sql))


if __name__ == "__main__":
    main()
