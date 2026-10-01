import logging
from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.extras import RealDictCursor

from quant.config import settings
from quant.scheduler.macro_scheduler import start_scheduler
from quant.engine.macro_scanner import run_macro_scan

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("quant.api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the background market-hours scheduler (runs at 09:45 AM)
    scheduler = start_scheduler()
    yield
    scheduler.shutdown()

app = FastAPI(title="Gidh Quant REST API", version="1.0.0", lifespan=lifespan)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)

def get_db_connection():
    return psycopg2.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        dbname=settings.DB_NAME,
        cursor_factory=RealDictCursor
    )

@app.get("/api/quant/health")
def health():
    return {"status": "ok", "service": "gidh-quant"}

@app.get("/api/quant/macro/dates")
def get_available_dates():
    """Returns list of distinct session dates with macro selection runs."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT DISTINCT session_date::text AS session_date
                FROM quant.macro_runs
                ORDER BY session_date DESC;
            """)
            rows = cur.fetchall()
            return {"dates": [r["session_date"] for r in rows]}
    finally:
        conn.close()

@app.get("/api/quant/macro/latest")
def get_latest_macro_run():
    """Returns the most recent macro selection run and its ranked candidates with futures confirmation."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, session_date::text, snapshot_time::text, total_scanned, shorts_count, longs_count, created_at
                FROM quant.macro_runs
                ORDER BY session_date DESC, snapshot_time DESC
                LIMIT 1;
            """)
            run = cur.fetchone()
            if not run:
                cur.execute("SELECT session_date::text FROM market.feature_runs WHERE status='SUCCEEDED' ORDER BY session_date DESC LIMIT 1;")
                latest_date_row = cur.fetchone()
                if latest_date_row:
                    target_date = latest_date_row["session_date"]
                    scan_res = run_macro_scan(session_date=target_date, snapshot_time="09:45:00", persist=True)
                    return scan_res
                raise HTTPException(status_code=404, detail="No macro runs found")

            run_id = run["id"]
            cur.execute("""
                SELECT 
                    id, instrument_id, symbol, sector, side, setup_type,
                    rvol, price, vwap, sigma, vwap_plus_1s, vwap_plus_2s, vwap_minus_1s, vwap_minus_2s,
                    pdh, pdl, prior_close, day_change_pct, vwap_dist_pct, clv,
                    future_close, futures_basis, futures_basis_pct, oi_change_session, oi_structure, rank
                FROM quant.macro_selections
                WHERE macro_run_id = %s
                ORDER BY side DESC, rank ASC;
            """, (run_id,))
            selections = cur.fetchall()
            
            shorts = [s for s in selections if s["side"] == "SHORT"]
            longs = [s for s in selections if s["side"] == "LONG"]
            
            return {
                "run_id": str(run["id"]),
                "session_date": run["session_date"],
                "snapshot_time": run["snapshot_time"],
                "total_scanned": run["total_scanned"],
                "shorts_count": run["shorts_count"],
                "longs_count": run["longs_count"],
                "created_at": run["created_at"].isoformat() if run["created_at"] else None,
                "shorts": shorts,
                "longs": longs
            }
    finally:
        conn.close()

@app.get("/api/quant/macro/history")
def get_macro_history(date: str = Query(..., description="Session date in YYYY-MM-DD format")):
    """Returns macro run and candidates for a specific date with futures confirmation."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, session_date::text, snapshot_time::text, total_scanned, shorts_count, longs_count, created_at
                FROM quant.macro_runs
                WHERE session_date = %s
                ORDER BY snapshot_time DESC
                LIMIT 1;
            """, (date,))
            run = cur.fetchone()
            if not run:
                try:
                    scan_res = run_macro_scan(session_date=date, snapshot_time="09:45:00", persist=True)
                    return scan_res
                except Exception as e:
                    logger.error(f"Error computing macro scan on demand for {date}: {e}")
                    raise HTTPException(status_code=404, detail=f"No macro run found for date {date}")

            run_id = run["id"]
            cur.execute("""
                SELECT 
                    id, instrument_id, symbol, sector, side, setup_type,
                    rvol, price, vwap, sigma, vwap_plus_1s, vwap_plus_2s, vwap_minus_1s, vwap_minus_2s,
                    pdh, pdl, prior_close, day_change_pct, vwap_dist_pct, clv,
                    future_close, futures_basis, futures_basis_pct, oi_change_session, oi_structure, rank
                FROM quant.macro_selections
                WHERE macro_run_id = %s
                ORDER BY side DESC, rank ASC;
            """, (run_id,))
            selections = cur.fetchall()
            
            shorts = [s for s in selections if s["side"] == "SHORT"]
            longs = [s for s in selections if s["side"] == "LONG"]
            
            return {
                "run_id": str(run["id"]),
                "session_date": run["session_date"],
                "snapshot_time": run["snapshot_time"],
                "total_scanned": run["total_scanned"],
                "shorts_count": run["shorts_count"],
                "longs_count": run["longs_count"],
                "created_at": run["created_at"].isoformat() if run["created_at"] else None,
                "shorts": shorts,
                "longs": longs
            }
    finally:
        conn.close()

@app.get("/api/quant/macro/symbols")
def get_macro_symbols():
    """Returns all active universe stock symbols."""
    try:
        from quant.engine.macro_reversal_scanner import get_all_symbols
        symbols = get_all_symbols()
        return {"symbols": symbols}
    except Exception as e:
        logger.error(f"Error fetching macro symbols: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/quant/macro/daily")
def get_macro_daily(
    symbol: str = Query(..., description="Stock symbol (e.g. HEROMOTOCO)"),
    date: str = Query(..., description="Target session date (YYYY-MM-DD)"),
    limit: int = Query(120, description="Lookback sessions")
):
    """Returns daily candles with PWH, PWL, CLV, and fractal swing labels."""
    try:
        from quant.engine.macro_reversal_scanner import get_macro_daily_candles
        limit_val = int(limit) if str(limit).isdigit() else 120
        df = get_macro_daily_candles(symbol.upper(), date, limit=limit_val)
        if df.empty:
            return {"symbol": symbol.upper(), "date": date, "candles": []}
        records = df.to_dict(orient="records")
        for r in records:
            if "date" in r and hasattr(r["date"], "strftime"):
                r["date"] = r["date"].strftime("%Y-%m-%d")
            elif "date" in r:
                r["date"] = str(r["date"])
        return {"symbol": symbol.upper(), "date": date, "candles": records}
    except Exception as e:
        logger.error(f"Error fetching macro daily candles for {symbol} on {date}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/quant/macro/intraday")
def get_macro_intraday(
    symbol: str = Query(..., description="Stock symbol (e.g. HEROMOTOCO)"),
    date: str = Query(..., description="Target session date (YYYY-MM-DD)")
):
    """Returns 1-minute intraday candles with rolling VWAP and calculated unviolated macro levels."""
    try:
        from quant.engine.macro_reversal_scanner import get_intraday_data_with_macro_levels
        df_1m, macro_levels = get_intraday_data_with_macro_levels(symbol.upper(), date)
        if df_1m.empty:
            return {"symbol": symbol.upper(), "date": date, "candles": [], "levels": macro_levels}
        records = df_1m.to_dict(orient="records")
        for r in records:
            if "ts" in r and hasattr(r["ts"], "isoformat"):
                r["ts"] = r["ts"].isoformat()
            if "ts_ist" in r and hasattr(r["ts_ist"], "isoformat"):
                r["ts_ist"] = r["ts_ist"].isoformat()
        return {"symbol": symbol.upper(), "date": date, "candles": records, "levels": macro_levels}
    except Exception as e:
        logger.error(f"Error fetching macro intraday candles for {symbol} on {date}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/quant/macro/levels")
def get_macro_levels(
    symbol: str = Query(..., description="Stock symbol (e.g. HEROMOTOCO)"),
    date: str = Query(..., description="Target session date (YYYY-MM-DD)")
):
    """Returns valid unviolated macro levels (PWH, PWL, PDH, PDL, Swing RES/SUP, CLV Supply/Demand zones) for symbol and date."""
    try:
        from quant.engine.macro_reversal_scanner import get_intraday_data_with_macro_levels
        _, macro_levels = get_intraday_data_with_macro_levels(symbol.upper(), date)
        return {
            "symbol": symbol.upper(),
            "session_date": date,
            "levels": macro_levels
        }
    except Exception as e:
        logger.error(f"Error fetching macro levels for {symbol} on {date}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("quant.app:app", host="0.0.0.0", port=settings.API_PORT, reload=True)
