"""
Day-by-Day Training & Evolution Game Runner
Strictly respects information boundary:
1. Brain sees ONLY data up to decision time (09:30 or 09:45 AM).
2. Evaluator uncovers post-entry tape (until 15:00 PM) to score MFE >= +1.5%.
"""

import sys
import pandas as pd
from config import get_connection
from brains.entry_brain import score_tape_at_time

def evaluate_candidates(session_date: str, picks: list):
    if not picks:
        print("  No candidates selected by Brain.")
        return []
        
    conn = get_connection()
    results = []
    
    for p in picks:
        sym = p['symbol']
        side = p['side']
        entry_price = p['price']
        
        # Query future max high and min low between 09:30 and 15:00
        q = """
            SELECT 
                MAX(f.cash_high) as future_high,
                MIN(f.cash_low) as future_low
            FROM market.intraday_features_1m f
            JOIN market.instruments i ON i.id = f.instrument_id
            WHERE i.symbol = %s
              AND DATE(f.ts AT TIME ZONE 'Asia/Kolkata') = %s::date
              AND (f.ts AT TIME ZONE 'Asia/Kolkata')::time >= '09:30:00'
              AND (f.ts AT TIME ZONE 'Asia/Kolkata')::time <= '15:00:00';
        """
        cur = conn.cursor()
        cur.execute(q, (sym, session_date))
        row = cur.fetchone()
        
        fut_h = float(row[0]) if row and row[0] else entry_price
        fut_l = float(row[1]) if row and row[1] else entry_price
        
        if side == 'LONG':
            mfe_pct = (fut_h - entry_price) / entry_price * 100.0
            hit_target = mfe_pct >= 1.5
        else:
            mfe_pct = (entry_price - fut_l) / entry_price * 100.0
            hit_target = mfe_pct >= 1.5
            
        results.append({
            **p,
            'future_high': fut_h,
            'future_low': fut_l,
            'mfe_pct': round(mfe_pct, 2),
            'hit_target': hit_target
        })
        
    conn.close()
    return results

def run_day(session_date: str, day_number: int):
    print("\n" + "="*80)
    print(f" TRAINING DAY {day_number}: SESSION {session_date}")
    print("="*80)
    
    # 1. BRAIN SELECTION (Up to 09:30 AM only)
    print(f"--- [09:30:00 AM IST] Brain Scanning 210 Universe (Blind to Future) ---")
    picks = score_tape_at_time(session_date, "09:30:00")
    
    if not picks:
        print("Brain selected 0 candidates passing the minimum score threshold (>= 60).")
        return
        
    print(f"Brain Selected {len(picks)} High-Conviction Entries:")
    for idx, p in enumerate(picks, 1):
        print(f"  #{idx} {p['symbol']:<12} | Side: {p['side']:<5} | Entry Price: {p['price']:>8.2f} | Score: {p['score']:>4.1f}/100")
        print(f"      Factors: {p['details']}")

    # 2. EVALUATION & SCORECARD UNVEILING (Post 09:30 to 15:00)
    print(f"\n--- [15:00:00 PM IST] Unveiling Scorecard (Target: >= +1.5% MFE) ---")
    results = evaluate_candidates(session_date, picks)
    
    hits = 0
    for idx, r in enumerate(results, 1):
        status = "HIT +1.5% TARGET" if r['hit_target'] else "MISSED TARGET"
        tag = "[+]" if r['hit_target'] else "[-]"
        if r['hit_target']: hits += 1
        print(f"  {tag} #{idx} {r['symbol']:<12} ({r['side']}) -> MFE: {r['mfe_pct']:>+5.2f}% | Result: {status}")

    print(f"\n Day {day_number} Result: {hits} / {len(results)} Hits ({hits/len(results)*100:.1f}%)")
    print("="*80)

if __name__ == "__main__":
    session = sys.argv[1] if len(sys.argv) > 1 else '2026-07-22'
    day_num = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    run_day(session, day_num)
