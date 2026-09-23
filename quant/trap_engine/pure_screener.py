import subprocess
import json
from typing import List
from quant.trap_engine.models import PureTrapCandidate

class PureTrapScreener:
    """
    Pure 1-Day PDH/PDL Screener running at exactly 09:45:00 AM.
    Finds:
      1. Bull Traps: Morning High > PDH, Price at 09:45 < PDH, RVOL between 1.5x and 6.0x
      2. Bear Traps: Morning Low < PDL, Price at 09:45 > PDL, RVOL between 1.5x and 6.0x
    """

    def __init__(self, db_name: str = "gidh_intraday"):
        self.db_name = db_name

    def run_screen(self, session_date: str) -> List[PureTrapCandidate]:
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
                df.prior_close as pdc,
                df.adr_20,
                df.average_daily_volume_20 as adv_20
            FROM market.daily_features df
            JOIN market.feature_runs r ON r.id = df.feature_run_id
            WHERE r.session_date = '{session_date}'
        ),
        features_945 AS (
            SELECT 
                instrument_id,
                relative_volume as rvol
            FROM market.intraday_features_1m
            WHERE ts = '{session_date} 09:45:00+05:30'
        ),
        screened AS (
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
                f.rvol::float as rvol,
                p.adv_20 as adv_20,
                p.adr_20::float as adr_20,
                CASE 
                    WHEN d.m30_high > p.pdh AND d.price_at_945 < p.pdh THEN 'BULL_TRAP'
                    WHEN d.m30_low < p.pdl AND d.price_at_945 > p.pdl THEN 'BEAR_TRAP'
                    ELSE 'NONE'
                END as setup_type,
                CASE 
                    WHEN d.m30_high > p.pdh THEN round(((d.m30_high - p.pdh) / p.pdh * 100)::numeric, 2)::float
                    WHEN d.m30_low < p.pdl THEN round(((p.pdl - d.m30_low) / p.pdl * 100)::numeric, 2)::float
                    ELSE 0.0
                END as sweep_depth_pct
            FROM daily_data d
            JOIN daily_pivots p ON p.instrument_id = d.instrument_id
            JOIN features_945 f ON f.instrument_id = d.instrument_id
            JOIN market.instruments i ON i.id = d.instrument_id
            WHERE ((d.m30_high > p.pdh AND d.price_at_945 < p.pdh) OR (d.m30_low < p.pdl AND d.price_at_945 > p.pdl))
              AND f.rvol >= 1.4 AND f.rvol <= 6.0
              AND p.adv_20 >= 100000
        )
        SELECT json_agg(t) FROM (
            SELECT * FROM screened
            ORDER BY (sweep_depth_pct * 1.5 + rvol * 1.0) DESC
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
        return [PureTrapCandidate(**item) for item in raw_data]
