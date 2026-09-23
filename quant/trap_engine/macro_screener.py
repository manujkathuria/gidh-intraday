import subprocess
import json
from typing import List
from quant.trap_engine.models import MacroTrapCandidate

class MacroTrapScreener:
    """
    Scans the 212-stock universe at exactly 09:45:00 AM.
    Evaluates:
      1. 7-Day Macro Context (Prior Week High, 5D Returns, Overextension)
      2. Morning Zone Defense (Swept PDH/PWH in first 20m and fell back below)
      3. Retail FOMO Fuel (1.5x <= RVOL <= 6.0x)
    """

    def __init__(self, db_name: str = "gidh_intraday"):
        self.db_name = db_name

    def run_screen(self, session_date: str) -> List[MacroTrapCandidate]:
        sql = f"""
        WITH daily_data AS (
            SELECT 
                c.instrument_id,
                min(c.open) FILTER (WHERE c.ts::time = '09:15:00') as session_open,
                max(c.high) FILTER (WHERE c.ts::time <= '09:45:00') as m30_high,
                min(c.low) FILTER (WHERE c.ts::time <= '09:45:00') as m30_low,
                max(c.close) FILTER (WHERE c.ts::time = '09:45:00') as price_at_945
            FROM market.cash_candles_1m c
            WHERE c.ts::date = '{session_date}'
            GROUP BY c.instrument_id
        ),
        daily_pivots AS (
            SELECT 
                df.instrument_id,
                df.prior_high as pdh,
                df.prior_low as pdl,
                df.prior_week_high as pwh,
                df.prior_week_low as pwl,
                df.return_5d_pct,
                df.distance_20d_high_pct,
                df.adr_20,
                df.average_daily_volume_20 as adv_20
            FROM market.daily_features df
            JOIN market.feature_runs r ON r.id = df.feature_run_id
            WHERE r.session_date = '{session_date}'
        ),
        features_945 AS (
            SELECT 
                instrument_id,
                relative_volume as rvol,
                adr_fuel_used_pct
            FROM market.intraday_features_1m
            WHERE ts = '{session_date} 09:45:00+05:30'
        )
        SELECT json_agg(t) FROM (
            SELECT 
                i.symbol,
                i.id as instrument_id,
                i.sector,
                d.session_open::float as session_open,
                d.m30_high::float as session_high,
                d.m30_low::float as session_low,
                d.price_at_945::float as price_at_945,
                p.pdh::float as pdh,
                p.pdl::float as pdl,
                p.pwh::float as pwh,
                p.pwl::float as pwl,
                p.return_5d_pct::float as return_5d_pct,
                p.distance_20d_high_pct::float as distance_20d_high_pct,
                p.adr_20::float as adr_20,
                f.adr_fuel_used_pct::float as adr_fuel_used_pct,
                f.rvol::float as rvol,
                (d.m30_high >= p.pdh) as swept_pdh,
                (d.m30_high >= coalesce(p.pwh, p.pdh)) as swept_pwh,
                (d.m30_high >= p.pdh AND d.price_at_945 < p.pdh) as is_failed_pdh,
                (d.m30_high >= coalesce(p.pwh, p.pdh) AND d.price_at_945 < coalesce(p.pwh, p.pdh)) as is_failed_pwh,
                p.adv_20 as adv_20
            FROM daily_data d
            JOIN daily_pivots p ON p.instrument_id = d.instrument_id
            JOIN features_945 f ON f.instrument_id = d.instrument_id
            JOIN market.instruments i ON i.id = d.instrument_id
            WHERE d.m30_high > p.pdh AND d.price_at_945 < p.pdh -- Swept & Failed Yesterday's High
              AND f.rvol >= 1.4 AND f.rvol <= 6.0             -- Retail FOMO confirmed, no block deal
              AND p.adv_20 >= 100000
            ORDER BY 
                (CASE WHEN d.m30_high >= coalesce(p.pwh, 999999) AND d.price_at_945 < coalesce(p.pwh, 999999) THEN 3.0 ELSE 0.0 END +
                 CASE WHEN p.return_5d_pct >= 4.0 THEN 2.0 ELSE 0.0 END +
                 f.rvol * 0.8 +
                 (d.m30_high - p.pdh) / NULLIF(p.pdh, 0) * 100) DESC
            LIMIT 5
        ) t;
        """
        res = subprocess.run(
            ["psql", "-d", self.db_name, "-t", "-A", "-c", sql],
            capture_output=True, text=True, check=True
        )
        out = res.stdout.strip()
        if not out or out == "" or out == "null":
            return []
        
        raw_data = json.loads(out)
        return [MacroTrapCandidate(**item) for item in raw_data]
