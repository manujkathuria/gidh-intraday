"""
Quant Entry Brain v1.0
Scans 210 universe between 09:15 and 10:00 AM.
Implements the 100-Point Scoring Model defined in quant/memory/ENTRY_BRAIN_SPEC.md.
Outputs Top <= 4 candidates.
"""

import pandas as pd
import numpy as np
from config import get_connection

def score_tape_at_time(session_date: str, decision_time_ist: str = "09:30:00"):
    conn = get_connection()
    
    query = """
        SELECT 
            f.ts,
            i.symbol,
            i.name,
            f.instrument_id,
            f.cash_open,
            f.cash_high,
            f.cash_low,
            f.cash_close,
            f.session_open,
            f.session_high,
            f.session_low,
            f.session_vwap,
            f.vwap_distance_sigma,
            f.relative_volume as rvol,
            f.clv,
            f.bar_range,
            f.bar_body,
            f.upper_wick_pct,
            f.lower_wick_pct,
            f.opening_range_15_high as or15_high,
            f.opening_range_15_low as or15_low,
            f.adr_fuel_used_pct,
            f.oi_change_15m,
            f.oi_change_session,
            f.futures_basis_pct
        FROM market.intraday_features_1m f
        JOIN market.instruments i ON i.id = f.instrument_id
        WHERE DATE(f.ts AT TIME ZONE 'Asia/Kolkata') = %s::date
          AND (f.ts AT TIME ZONE 'Asia/Kolkata')::time = %s::time
        ORDER BY i.symbol ASC;
    """
    
    df = pd.read_sql(query, conn, params=(session_date, decision_time_ist))
    conn.close()
    
    if df.empty:
        return []
    
    candidates = []
    
    for _, row in df.iterrows():
        rvol = float(row['rvol']) if pd.notnull(row['rvol']) else 1.0
        clv = float(row['clv']) if pd.notnull(row['clv']) else 0.0
        vwap = float(row['session_vwap']) if pd.notnull(row['session_vwap']) else row['cash_close']
        close = float(row['cash_close'])
        vwap_sigma = float(row['vwap_distance_sigma']) if pd.notnull(row['vwap_distance_sigma']) else 0.0
        u_wick = float(row['upper_wick_pct']) if pd.notnull(row['upper_wick_pct']) else 0.0
        l_wick = float(row['lower_wick_pct']) if pd.notnull(row['lower_wick_pct']) else 0.0
        body = float(row['bar_body']) if pd.notnull(row['bar_body']) else 0.0
        brange = float(row['bar_range']) if pd.notnull(row['bar_range']) and row['bar_range'] > 0 else 1.0
        body_ratio = body / brange
        or15_h = float(row['or15_high']) if pd.notnull(row['or15_high']) else close
        or15_l = float(row['or15_low']) if pd.notnull(row['or15_low']) else close
        adr_fuel = float(row['adr_fuel_used_pct']) if pd.notnull(row['adr_fuel_used_pct']) else 30.0
        oi_15m = int(row['oi_change_15m']) if pd.notnull(row['oi_change_15m']) else 0
        oi_sess = int(row['oi_change_session']) if pd.notnull(row['oi_change_session']) else 0
        
        # Hard Gate: Dead tape or exhausted fuel
        if rvol < 1.8 or adr_fuel > 75.0:
            continue
            
        # 1. Participation Score (25 max)
        if 3.0 <= rvol <= 5.0:
            part_score = 25.0
        elif 2.2 <= rvol < 3.0 or 5.0 < rvol <= 7.0:
            part_score = 18.0
        elif 7.0 < rvol <= 10.0:
            part_score = 10.0
        elif rvol > 10.0:
            part_score = 5.0
        else:
            part_score = 0.0
            
        # 2. Fuel Score (10 max)
        if 20.0 <= adr_fuel <= 55.0:
            fuel_score = 10.0
        elif adr_fuel < 20.0:
            fuel_score = 5.0
        else:
            fuel_score = 0.0
            
        # 3. OI Score (10 max)
        if oi_sess > 0 and oi_15m > 0:
            oi_score = 10.0
        elif oi_sess > 0:
            oi_score = 5.0
        else:
            oi_score = 0.0
            
        # --- LONG SCORING ---
        if close > vwap:
            # Hard Gate for Long: Must not have massive upper rejection
            if u_wick > 0.40 or clv < 0.20:
                continue

            # Location (20 max)
            if 0.25 <= vwap_sigma <= 1.75:
                loc_l = 20.0
            elif 0 < vwap_sigma < 0.25:
                loc_l = 12.0
            elif vwap_sigma > 2.25:
                loc_l = 5.0
            else:
                loc_l = 10.0
                
            # Candle (20 max)
            c_score_l = 0.0
            if clv >= 0.60: c_score_l += 10.0
            elif clv >= 0.35: c_score_l += 5.0
            if u_wick <= 0.25: c_score_l += 5.0
            if body_ratio >= 0.45: c_score_l += 5.0
            
            # OR15 Break (15 max)
            or_l = 15.0 if close >= or15_h else 0.0
            
            total_l = part_score + loc_l + c_score_l + or_l + oi_score + fuel_score
            if total_l >= 60.0:
                candidates.append({
                    'symbol': row['symbol'],
                    'side': 'LONG',
                    'decision_time': decision_time_ist,
                    'price': close,
                    'score': round(total_l, 1),
                    'rvol': round(rvol, 2),
                    'clv': round(clv, 2),
                    'vwap_sigma': round(vwap_sigma, 2),
                    'adr_fuel': round(adr_fuel, 1),
                    'oi_session': oi_sess,
                    'details': f"RVOL:{rvol:.1f}x | CLV:{clv:.2f} | Loc:{loc_l} | Candle:{c_score_l} | OR15:{or_l} | OI:{oi_score} | Fuel:{fuel_score}"
                })
                
        # --- SHORT SCORING ---
        if close < vwap:
            # Day 1 Learning Gate: Disallow Shorts if CLV > 0.20 (no absorbing/recovering candles)
            # unless there is a severe upper wick trap rejection >= 35%
            if clv > 0.20 and u_wick < 0.35:
                continue
                
            # Location (20 max)
            if -1.75 <= vwap_sigma <= -0.25:
                loc_s = 20.0
            elif -0.25 < vwap_sigma < 0:
                loc_s = 12.0
            elif vwap_sigma < -2.25:
                loc_s = 8.0
            else:
                loc_s = 10.0
                
            # Candle (20 max)
            c_score_s = 0.0
            if clv <= -0.20: c_score_s += 10.0
            elif clv <= 0.15: c_score_s += 6.0
            if l_wick <= 0.30 or u_wick >= 0.30: c_score_s += 5.0
            if body_ratio >= 0.35: c_score_s += 5.0
            
            # OR15 Breakdown (15 max)
            or_s = 15.0 if close <= or15_l else 0.0
            
            # Volume Breakdown Runner Boost (Day 1 Learning)
            extra_bd_boost = 0.0
            if rvol >= 8.0 and close <= or15_l and close < vwap:
                extra_bd_boost = 10.0
            
            total_s = part_score + loc_s + c_score_s + or_s + oi_score + fuel_score + extra_bd_boost
            if total_s >= 60.0:
                candidates.append({
                    'symbol': row['symbol'],
                    'side': 'SHORT',
                    'decision_time': decision_time_ist,
                    'price': close,
                    'score': round(total_s, 1),
                    'rvol': round(rvol, 2),
                    'clv': round(clv, 2),
                    'vwap_sigma': round(vwap_sigma, 2),
                    'adr_fuel': round(adr_fuel, 1),
                    'oi_session': oi_sess,
                    'details': f"RVOL:{rvol:.1f}x | CLV:{clv:.2f} | Loc:{loc_s} | Candle:{c_score_s} | OR15:{or_s} | OI:{oi_score} | Fuel:{fuel_score}"
                })

    # Sort descending by score and pick Top <= 4
    df_cands = pd.DataFrame(candidates)
    if df_cands.empty:
        return []
    
    df_cands = df_cands.sort_values('score', ascending=False).head(4)
    return df_cands.to_dict(orient='records')
