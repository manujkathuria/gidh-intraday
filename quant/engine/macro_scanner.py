import math
import logging
from typing import Dict, List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from quant.config import settings

logger = logging.getLogger("quant.macro_scanner")

def get_db_connection():
    return psycopg2.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        dbname=settings.DB_NAME,
        cursor_factory=RealDictCursor
    )

def run_macro_scan(session_date: str = "2026-09-29", snapshot_time: str = "09:45:00", min_rvol: float = 2.5, persist: bool = True) -> Dict:
    """
    3-Pillar Macro Stock Selection Engine (09:45 AM Snapshot):
    1. Institutional Volume: RVOL >= 2.5x
    2. Range Boundary:
       - Grade A Short: Cash Price <= PDL * 0.997 & Red Day (Price < Open & Price < Prior Close)
       - Grade A Long:  Cash Price >= PDH * 1.003 & Green Day (Price > Open & Price > Prior Close)
    3. Futures Concurrence:
       - Active F&O Contract present
       - Shorts: Futures is Down / Red (Future Close < Future Prior Close)
       - Longs:  Futures is Up / Green (Future Close > Future Prior Close)
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            query = """
            WITH target_run AS (
                SELECT id FROM market.feature_runs 
                WHERE session_date = %s AND feature_set = 'DAILY' AND status = 'SUCCEEDED'
                LIMIT 1
            ),
            candle_window AS (
                SELECT 
                    c.instrument_id,
                    c.ts,
                    (c.ts AT TIME ZONE 'Asia/Kolkata')::time AS t_min,
                    c.open, c.high, c.low, c.close, c.volume,
                    SUM(c.volume) OVER w AS cum_vol,
                    SUM(c.close * c.volume) OVER w AS cum_pv,
                    SUM(c.close * c.close * c.volume) OVER w AS cum_p2v
                FROM market.cash_candles_1m c
                WHERE c.ts >= (%s::timestamp AT TIME ZONE 'Asia/Kolkata')
                  AND c.ts <= ((%s || ' ' || %s)::timestamp AT TIME ZONE 'Asia/Kolkata')
                WINDOW w AS (PARTITION BY c.instrument_id ORDER BY c.ts)
            ),
            agg_stats AS (
                SELECT 
                    instrument_id,
                    (ARRAY_AGG(close ORDER BY ts DESC))[1] AS current_price,
                    (ARRAY_AGG(cum_vol ORDER BY ts DESC))[1] AS total_volume,
                    (ARRAY_AGG(cum_pv / NULLIF(cum_vol, 0) ORDER BY ts DESC))[1] AS current_vwap,
                    (ARRAY_AGG(SQRT(GREATEST((cum_p2v / NULLIF(cum_vol, 0)) - POWER(cum_pv / NULLIF(cum_vol, 0), 2), 0)) ORDER BY ts DESC))[1] AS current_sigma,
                    MAX(high) AS session_high,
                    MIN(low) AS session_low,
                    (ARRAY_AGG(open ORDER BY ts ASC))[1] AS session_open
                FROM candle_window
                GROUP BY instrument_id
            ),
            hist_cum AS (
                SELECT c.instrument_id,
                       (c.ts AT TIME ZONE 'Asia/Kolkata')::date AS dt,
                       SUM(c.volume) AS session_vol_to_now
                FROM market.cash_candles_1m c
                WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date < %s::date
                  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::date >= %s::date - INTERVAL '40 days'
                  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time >= '09:15:00'::time
                  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time <= %s::time
                GROUP BY c.instrument_id, (c.ts AT TIME ZONE 'Asia/Kolkata')::date
            ),
            hist_profile AS (
                SELECT instrument_id, AVG(session_vol_to_now)::bigint AS expected_cum_vol
                FROM (
                    SELECT instrument_id, session_vol_to_now,
                           ROW_NUMBER() OVER (PARTITION BY instrument_id ORDER BY dt DESC) AS rank
                    FROM hist_cum
                ) h
                WHERE rank <= 20
                GROUP BY instrument_id
            ),
            fut_snapshot AS (
                SELECT DISTINCT ON (f.instrument_id)
                    f.instrument_id,
                    f.future_close,
                    f.futures_basis,
                    f.futures_basis_pct,
                    f.oi_change_session,
                    fc_prev.close AS fut_prior_close
                FROM market.intraday_features_1m f
                JOIN market.future_contracts fc ON fc.id = f.future_contract_id AND fc.is_active
                LEFT JOIN market.future_candles_1d fc_prev ON fc_prev.future_contract_id = fc.id 
                     AND fc_prev.session_date = (
                         SELECT MAX(session_date) FROM market.future_candles_1d WHERE session_date < %s::date
                     )
                WHERE f.ts <= ((%s || ' ' || %s)::timestamp AT TIME ZONE 'Asia/Kolkata')
                  AND f.ts >= (%s::timestamp AT TIME ZONE 'Asia/Kolkata')
                ORDER BY f.instrument_id, f.ts DESC
            )
            SELECT 
                i.id AS instrument_id,
                i.symbol,
                i.sector,
                a.current_price,
                a.current_vwap AS vwap,
                COALESCE(a.current_sigma, 0) AS sigma,
                a.session_high,
                a.session_low,
                a.session_open,
                df.prior_close,
                df.prior_high AS pdh,
                df.prior_low AS pdl,
                ROUND((a.total_volume::numeric / NULLIF(hp.expected_cum_vol, 0))::numeric, 2) AS rvol,
                ROUND(((a.current_price - df.prior_close) / df.prior_close * 100)::numeric, 2) AS day_change_pct,
                ROUND(((a.current_price - a.current_vwap) / a.current_vwap * 100)::numeric, 2) AS vwap_dist_pct,
                ROUND(((a.current_price - a.session_low) / NULLIF(a.session_high - a.session_low, 0))::numeric, 4) AS clv,
                f.future_close,
                f.futures_basis,
                f.futures_basis_pct,
                f.oi_change_session,
                f.fut_prior_close,
                CASE 
                    WHEN f.future_close IS NOT NULL AND f.fut_prior_close IS NOT NULL THEN
                        ROUND(((f.future_close - f.fut_prior_close) / f.fut_prior_close * 100)::numeric, 2)
                    ELSE NULL
                END AS fut_change_pct
            FROM agg_stats a
            JOIN market.instruments i ON i.id = a.instrument_id AND i.is_active
            JOIN target_run tr ON true
            JOIN market.daily_features df ON df.feature_run_id = tr.id AND df.instrument_id = a.instrument_id
            JOIN hist_profile hp ON hp.instrument_id = a.instrument_id
            LEFT JOIN fut_snapshot f ON f.instrument_id = a.instrument_id
            WHERE (a.total_volume::numeric / NULLIF(hp.expected_cum_vol, 0)) >= %s
            ORDER BY rvol DESC;
            """
            
            cur.execute(query, (
                session_date, session_date, session_date, snapshot_time,
                session_date, session_date, snapshot_time,
                session_date, session_date, snapshot_time, session_date,
                min_rvol
            ))
            rows = cur.fetchall()
            
            shorts = []
            longs = []
            
            for row in rows:
                price = float(row["current_price"])
                vwap = float(row["vwap"])
                sigma = float(row["sigma"])
                pdh = float(row["pdh"])
                pdl = float(row["pdl"])
                prior_close = float(row["prior_close"])
                session_open = float(row["session_open"])
                rvol = float(row["rvol"])
                
                # Futures metadata
                fut_close = float(row["future_close"]) if row["future_close"] is not None else None
                fut_basis = float(row["futures_basis"]) if row["futures_basis"] is not None else None
                fut_basis_pct = float(row["futures_basis_pct"]) if row["futures_basis_pct"] is not None else None
                oi_delta = int(row["oi_change_session"]) if row["oi_change_session"] is not None else None
                fut_chg = float(row["fut_change_pct"]) if row["fut_change_pct"] is not None else None
                
                # Sigma bands
                vwap_plus_1s = round(vwap + sigma, 2)
                vwap_plus_2s = round(vwap + 2 * sigma, 2)
                vwap_minus_1s = round(vwap - sigma, 2)
                vwap_minus_2s = round(vwap - 2 * sigma, 2)
                
                item = {
                    "instrument_id": row["instrument_id"],
                    "symbol": row["symbol"],
                    "sector": row["sector"] or "OTHERS",
                    "price": round(price, 2),
                    "vwap": round(vwap, 2),
                    "sigma": round(sigma, 2),
                    "vwap_plus_1s": vwap_plus_1s,
                    "vwap_plus_2s": vwap_plus_2s,
                    "vwap_minus_1s": vwap_minus_1s,
                    "vwap_minus_2s": vwap_minus_2s,
                    "pdh": round(pdh, 2),
                    "pdl": round(pdl, 2),
                    "prior_close": round(prior_close, 2),
                    "rvol": rvol,
                    "day_change_pct": float(row["day_change_pct"]),
                    "vwap_dist_pct": float(row["vwap_dist_pct"]),
                    "clv": float(row["clv"]) if row["clv"] is not None else 0.5,
                    "future_close": round(fut_close, 2) if fut_close is not None else None,
                    "futures_basis": round(fut_basis, 2) if fut_basis is not None else None,
                    "futures_basis_pct": round(fut_basis_pct, 2) if fut_basis_pct is not None else None,
                    "oi_change_session": oi_delta,
                    "fut_change_pct": fut_chg
                }
                
                # 3-PILLAR MACRO SELECTION:
                # Must have active futures contract
                has_futures = fut_close is not None
                
                # 1. Grade A Short:
                # - Price <= PDL * 0.997 (Decisive Breakdown)
                # - Red in Cash (Price < Open & Price < Prior Close)
                # - Futures Concurrence (Futures present & also Red)
                if has_futures and price <= (pdl * 0.997) and price < session_open and price < prior_close:
                    if fut_chg is None or fut_chg <= 0:
                        item["side"] = "SHORT"
                        item["setup_type"] = "PDL_BREAKDOWN"
                        item["oi_structure"] = "FUTURES_CONFIRMED"
                        shorts.append(item)
                
                # 2. Grade A Long:
                # - Price >= PDH * 1.003 (Decisive Breakout)
                # - Green in Cash (Price > Open & Price > Prior Close)
                # - Futures Concurrence (Futures present & also Green)
                elif has_futures and price >= (pdh * 1.003) and price > session_open and price > prior_close:
                    if fut_chg is None or fut_chg >= 0:
                        item["side"] = "LONG"
                        item["setup_type"] = "PDH_BREAKOUT"
                        item["oi_structure"] = "FUTURES_CONFIRMED"
                        longs.append(item)

            # Assign ranks
            for idx, s in enumerate(shorts, start=1):
                s["rank"] = idx
            for idx, l in enumerate(longs, start=1):
                l["rank"] = idx

            # Persistence
            run_id = None
            if persist and (shorts or longs):
                insert_run_sql = """
                INSERT INTO quant.macro_runs (session_date, snapshot_time, total_scanned, shorts_count, longs_count)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (session_date, snapshot_time) DO UPDATE SET
                    total_scanned = EXCLUDED.total_scanned,
                    shorts_count = EXCLUDED.shorts_count,
                    longs_count = EXCLUDED.longs_count,
                    created_at = NOW()
                RETURNING id;
                """
                cur.execute(insert_run_sql, (session_date, snapshot_time, len(rows), len(shorts), len(longs)))
                run_id = str(cur.fetchone()["id"])
                
                # Clear existing selections for this run
                cur.execute("DELETE FROM quant.macro_selections WHERE macro_run_id = %s", (run_id,))
                
                insert_sel_sql = """
                INSERT INTO quant.macro_selections (
                    macro_run_id, instrument_id, symbol, sector, side, setup_type,
                    rvol, price, vwap, sigma, vwap_plus_1s, vwap_plus_2s, vwap_minus_1s, vwap_minus_2s,
                    pdh, pdl, prior_close, day_change_pct, vwap_dist_pct, clv,
                    future_close, futures_basis, futures_basis_pct, oi_change_session, oi_structure, rank
                ) VALUES (
                    %(macro_run_id)s, %(instrument_id)s, %(symbol)s, %(sector)s, %(side)s, %(setup_type)s,
                    %(rvol)s, %(price)s, %(vwap)s, %(sigma)s, %(vwap_plus_1s)s, %(vwap_plus_2s)s, %(vwap_minus_1s)s, %(vwap_minus_2s)s,
                    %(pdh)s, %(pdl)s, %(prior_close)s, %(day_change_pct)s, %(vwap_dist_pct)s, %(clv)s,
                    %(future_close)s, %(futures_basis)s, %(futures_basis_pct)s, %(oi_change_session)s, %(oi_structure)s, %(rank)s
                );
                """
                for item in shorts + longs:
                    item_copy = dict(item)
                    item_copy["macro_run_id"] = run_id
                    cur.execute(insert_sel_sql, item_copy)
                
                conn.commit()

            return {
                "run_id": run_id,
                "session_date": session_date,
                "snapshot_time": snapshot_time,
                "total_scanned": len(rows),
                "shorts": shorts,
                "longs": longs
            }
    finally:
        conn.close()
