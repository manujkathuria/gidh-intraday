"""
🏛️ GIDH QUANT MACRO: DATA INTEGRITY & HISTORICAL BACKFILL ENGINE
Ensures quant.macro_daily_picks is 100% complete, verified, and backfilled for all market sessions.
"""

import sys
import argparse
import pandas as pd
from quant.base.db import get_db_connection
from quant.macro.step1 import run_macro_step1

def backfill_macro_picks(start_date: str = None, end_date: str = None, verbose: bool = True):
    """
    Scans all distinct session dates in market.future_candles_1d and populates quant.macro_daily_picks.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Fetch all valid dates
    cur.execute("""
        SELECT DISTINCT session_date::text 
        FROM market.future_candles_1d 
        ORDER BY 1 ASC;
    """)
    all_dates = [r[0] for r in cur.fetchall()]
    conn.close()
    
    # We skip first 3 sessions for 3D lag and 10D ADR warmup
    if len(all_dates) > 3:
        valid_dates = all_dates[3:]
    else:
        valid_dates = all_dates
        
    if start_date:
        valid_dates = [d for d in valid_dates if d >= start_date]
    if end_date:
        valid_dates = [d for d in valid_dates if d <= end_date]
        
    if verbose:
        print("\n" + "=" * 80)
        print(f"       🦅 GIDH QUANT MACRO: BACKFILL & POPULATION ENGINE")
        print("=" * 80)
        print(f"Targeting {len(valid_dates)} trading sessions (from {valid_dates[0]} to {valid_dates[-1]})...\n")
        
    success_count = 0
    total_picks_saved = 0
    
    for idx, date in enumerate(valid_dates, 1):
        res = run_macro_step1(date, save_to_db=True, verbose=False)
        longs_cnt = len(res.get("longs", []))
        shorts_cnt = len(res.get("shorts", []))
        squeezes_cnt = len(res.get("squeezes", []))
        total_picks = min(longs_cnt, 6) + min(shorts_cnt, 4) + min(squeezes_cnt, 2)
        total_picks_saved += total_picks
        success_count += 1
        
        if verbose:
            print(f"[{idx:>2}/{len(valid_dates)}] {date}: Saved {total_picks:>2} picks (Bulls: {longs_cnt:>2}, Bears: {shorts_cnt:>2}, Squeezes: {squeezes_cnt:>2})")
            
    if verbose:
        print("\n" + "=" * 80)
        print(f"✅ BACKFILL COMPLETE: {success_count} sessions populated | {total_picks_saved} focus picks stored.")
        print("=" * 80 + "\n")
        
    return success_count, total_picks_saved

def verify_data_integrity(verbose: bool = True) -> dict:
    """
    Audits data integrity between market.future_candles_1d and quant.macro_daily_picks.
    """
    conn = get_db_connection()
    
    audit_sql = """
    WITH market_dates AS (
        SELECT DISTINCT session_date 
        FROM market.future_candles_1d
    ),
    quant_dates AS (
        SELECT 
            session_date,
            COUNT(*) as total_picks,
            COUNT(*) FILTER (WHERE stance = 'LONG BUILDUP') as longs_count,
            COUNT(*) FILTER (WHERE stance = 'SHORT ATTACK') as shorts_count,
            COUNT(*) FILTER (WHERE stance = 'SHORT COVERING') as squeeze_count,
            MIN(macro_fuel_pct) as min_fuel,
            MAX(macro_fuel_pct) as max_fuel,
            AVG(macro_fuel_pct) as avg_fuel
        FROM quant.macro_daily_picks
        GROUP BY session_date
    )
    SELECT 
        m.session_date::text as session_date,
        COALESCE(q.total_picks, 0) as total_picks,
        COALESCE(q.longs_count, 0) as longs_count,
        COALESCE(q.shorts_count, 0) as shorts_count,
        COALESCE(q.squeeze_count, 0) as squeeze_count,
        q.min_fuel,
        q.max_fuel,
        ROUND(COALESCE(q.avg_fuel, 0)::numeric, 1) as avg_fuel
    FROM market_dates m
    LEFT JOIN quant_dates q ON m.session_date = q.session_date
    ORDER BY m.session_date ASC;
    """
    
    df = pd.read_sql(audit_sql, conn)
    conn.close()
    
    total_market_days = len(df)
    populated_days = len(df[df['total_picks'] > 0])
    missing_days = df[df['total_picks'] == 0]
    
    if verbose:
        print("\n" + "=" * 90)
        print("       🛡️ GIDH QUANT MACRO: DATA INTEGRITY & AUDIT REPORT")
        print("=" * 90)
        print(f"• Total Market Sessions:  {total_market_days} Days")
        print(f"• Populated Macro Picks:  {populated_days} Days ({populated_days/total_market_days*100:.1f}% Coverage)")
        print(f"• Unpopulated Sessions:   {len(missing_days)} Days (Warmup or un-backfilled)")
        print("-" * 90 + "\n")
        
        # Display recent 15 sessions
        print("RECENT 15 SESSIONS AUDIT MATRIX:")
        print(f"{'Session Date':<14} {'Total Picks':<13} {'Longs':<8} {'Shorts':<8} {'Squeezes':<10} {'Fuel (Min/Avg/Max)'}")
        print("-" * 90)
        for _, r in df.tail(15).iterrows():
            fuel_str = f"{r['min_fuel']:.0f}% / {r['avg_fuel']:.0f}% / {r['max_fuel']:.0f}%" if r['total_picks'] > 0 else "N/A"
            print(f"{r['session_date']:<14} {r['total_picks']:<13} {r['longs_count']:<8} {r['shorts_count']:<8} {r['squeeze_count']:<10} {fuel_str}")
        print("\n" + "=" * 90 + "\n")
        
    return {
        "total_market_days": total_market_days,
        "populated_days": populated_days,
        "coverage_pct": (populated_days / total_market_days) * 100.0 if total_market_days > 0 else 0,
        "missing_dates": missing_days['session_date'].tolist()
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Quant Macro Data Integrity & Backfill Tool")
    parser.add_argument("--backfill", action="store_true", help="Run full historical backfill across all dates")
    parser.add_argument("--audit", action="store_true", help="Run data integrity audit")
    args = parser.parse_args()
    
    if args.backfill or len(sys.argv) == 1:
        backfill_macro_picks()
        verify_data_integrity()
    elif args.audit:
        verify_data_integrity()
