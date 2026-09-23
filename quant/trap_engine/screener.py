import subprocess
import json
from typing import List, Optional
from datetime import date
from quant.trap_engine.models import TrapCandidate

class TrapScreener:
    """
    High-speed SQL pre-filter that scans the 212-stock universe at 09:45 AM.
    Extracts the top 5-10 candidates meeting forensic trap criteria:
      1. Morning surge >= 35% ADR fuel between 09:15 and 09:35
      2. Price submerged below VWAP by 09:45 (sigma between -0.80 and -0.05)
      3. Liquid universe (ADV 20 >= 100,000)
    """

    def __init__(self, db_name: str = "gidh_intraday"):
        self.db_name = db_name

    def run_screen(self, session_date: str, scan_time: str = "09:45:00") -> List[TrapCandidate]:
        sql = f"""
        WITH morning_snapshot AS (
            SELECT 
                f.instrument_id,
                f.cash_close as price_at_scan,
                f.session_open,
                f.session_high,
                f.session_low,
                f.session_vwap,
                f.vwap_distance_sigma,
                f.adr_fuel_used_pct,
                f.opening_range_15_high,
                f.opening_range_15_low,
                f.relative_volume
            FROM market.intraday_features_1m f
            WHERE f.ts = '{session_date} {scan_time}+05:30'
        ),
        peak_metrics AS (
            SELECT 
                c.instrument_id,
                min(c.ts) as peak_time,
                max(c.high) as peak_price,
                max(f.upper_wick_pct) FILTER (WHERE c.high = ms.session_high) as peak_upper_wick,
                max(f.clv) FILTER (WHERE c.high = ms.session_high) as peak_clv,
                max(f.vwap_distance_sigma) as max_morning_sigma
            FROM market.cash_candles_1m c
            JOIN morning_snapshot ms ON ms.instrument_id = c.instrument_id
            JOIN market.intraday_features_1m f ON f.instrument_id = c.instrument_id AND f.ts = c.ts
            WHERE c.ts BETWEEN '{session_date} 09:15:00+05:30' AND '{session_date} 09:35:00+05:30'
            GROUP BY c.instrument_id, ms.session_high
        ),
        daily_ctx AS (
            SELECT 
                df.instrument_id,
                df.prior_high as pdh,
                df.prior_low as pdl,
                df.prior_week_high as pwh,
                df.prior_week_low as pwl,
                df.adr_20,
                df.average_daily_volume_20 as adv_20
            FROM market.daily_features df
            JOIN market.feature_runs r ON r.id = df.feature_run_id
            WHERE r.session_date = '{session_date}'
        )
        SELECT json_agg(t) FROM (
            SELECT 
                i.symbol,
                i.id as instrument_id,
                i.sector,
                ms.session_open::float as session_open,
                ms.session_high::float as session_high,
                ms.session_low::float as session_low,
                to_char(pm.peak_time AT TIME ZONE 'Asia/Kolkata', 'HH24:MI:SS') as peak_time,
                ms.price_at_scan::float as price_at_scan,
                round(ms.session_vwap::numeric, 2)::float as session_vwap,
                round(ms.vwap_distance_sigma::numeric, 2)::float as vwap_distance_sigma,
                round(dc.adr_20::numeric, 2)::float as adr_20,
                round(ms.adr_fuel_used_pct::numeric, 2)::float as adr_fuel_used_pct,
                round(ms.relative_volume::numeric, 2)::float as rvol,
                CASE WHEN ms.session_high >= dc.pdh THEN true ELSE false END as swept_pdh,
                CASE WHEN ms.session_high >= dc.pwh THEN true ELSE false END as swept_pwh,
                dc.adv_20 as adv_20,
                ms.opening_range_15_high::float as or15_high,
                ms.opening_range_15_low::float as or15_low,
                round(coalesce(pm.peak_upper_wick, 0)::numeric, 1)::float as peak_upper_wick_pct,
                round(coalesce(pm.peak_clv, 0)::numeric, 2)::float as peak_clv
            FROM morning_snapshot ms
            JOIN market.instruments i ON i.id = ms.instrument_id
            JOIN peak_metrics pm ON pm.instrument_id = ms.instrument_id
            JOIN daily_ctx dc ON dc.instrument_id = ms.instrument_id
            WHERE pm.peak_time::time <= '09:35:00'
              AND (ms.session_high - ms.session_open) / NULLIF(dc.adr_20, 0) >= 0.35 -- >= 35% ADR Surge
              AND ms.price_at_scan < ms.session_vwap                                -- Submerged below VWAP
              AND ms.vwap_distance_sigma >= -1.0                                    -- In sweet spot pocket (not oversold)
              AND dc.adv_20 >= 100000
            ORDER BY 
                (CASE WHEN ms.session_high >= dc.pdh THEN 2.0 ELSE 0.0 END + 
                 ms.adr_fuel_used_pct * 1.5 + 
                 ms.relative_volume * 1.0) DESC
            LIMIT 10
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
        candidates = []
        for item in raw_data:
            candidates.append(TrapCandidate(
                symbol=item["symbol"],
                instrument_id=item["instrument_id"],
                sector=item.get("sector"),
                session_open=item["session_open"],
                session_high=item["session_high"],
                session_low=item["session_low"],
                peak_time=item["peak_time"],
                price_at_scan=item["price_at_scan"],
                session_vwap=item["session_vwap"],
                vwap_distance_sigma=item["vwap_distance_sigma"],
                adr_20=item["adr_20"],
                adr_fuel_used_pct=item["adr_fuel_used_pct"],
                rvol=item["rvol"],
                swept_pdh=item["swept_pdh"],
                swept_pwh=item["swept_pwh"],
                adv_20=item["adv_20"],
                or15_high=item["or15_high"],
                or15_low=item["or15_low"],
                peak_upper_wick_pct=item["peak_upper_wick_pct"],
                peak_clv=item["peak_clv"]
            ))
        return candidates
