"""
Dark Age Exploration: 7 Days Study (2026-07-13 to 2026-07-21)
Goal: Inspect the tape across 210 instruments between 09:15 and 10:00 AM,
and evaluate what high-probability entries leading to >= +1.5% MFE look like.
"""

import pandas as pd
import numpy as np
from config import get_connection

EXPLORATION_DAYS = [
    '2026-07-13',
    '2026-07-14',
    '2026-07-15',
    '2026-07-16',
    '2026-07-17',
    '2026-07-20',
    '2026-07-21'
]

def load_session_data(session_date: str):
    conn = get_connection()
    
    # 1. Load 09:15 to 10:00 features for all 210 instruments
    features_query = """
        SELECT 
            f.ts,
            i.symbol,
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
            f.opening_range_15_high as or15_high,
            f.opening_range_15_low as or15_low,
            f.upper_wick_pct,
            f.lower_wick_pct,
            f.cumulative_volume
        FROM market.intraday_features_1m f
        JOIN market.instruments i ON i.id = f.instrument_id
        WHERE f.ts >= %s::date + TIME '03:45:00'   -- 09:15 IST (UTC: 03:45)
          AND f.ts <= %s::date + TIME '04:30:00'   -- 10:00 IST (UTC: 04:30)
        ORDER BY f.ts ASC, i.symbol ASC;
    """
    
    # 2. Load outcome (max high, min low) between 09:30 and 15:00 for each instrument
    outcome_query = """
        SELECT 
            i.symbol,
            f.instrument_id,
            MAX(f.cash_high) as future_high,
            MIN(f.cash_low) as future_low,
            (SELECT cash_close FROM market.intraday_features_1m 
             WHERE instrument_id = f.instrument_id AND ts = %s::date + TIME '04:00:00' LIMIT 1) as price_at_0930,
            (SELECT cash_close FROM market.intraday_features_1m 
             WHERE instrument_id = f.instrument_id AND ts = %s::date + TIME '04:15:00' LIMIT 1) as price_at_0945,
            (SELECT cash_close FROM market.intraday_features_1m 
             WHERE instrument_id = f.instrument_id AND ts = %s::date + TIME '04:30:00' LIMIT 1) as price_at_1000
        FROM market.intraday_features_1m f
        JOIN market.instruments i ON i.id = f.instrument_id
        WHERE f.ts >= %s::date + TIME '04:00:00'   -- from 09:30 IST
          AND f.ts <= %s::date + TIME '09:30:00'   -- to 15:00 IST (UTC: 09:30)
        GROUP BY i.symbol, f.instrument_id;
    """
    
    df_feat = pd.read_sql(features_query, conn, params=(session_date, session_date))
    df_out = pd.read_sql(outcome_query, conn, params=(session_date, session_date, session_date, session_date, session_date))
    conn.close()
    
    return df_feat, df_out

def analyze_day(session_date: str):
    df_feat, df_out = load_session_data(session_date)
    if df_feat.empty or df_out.empty:
        print(f"[{session_date}] No data found.")
        return None
    
    # Calculate MFE from 09:30 close
    df_out['long_mfe_0930'] = (df_out['future_high'] - df_out['price_at_0930']) / df_out['price_at_0930'] * 100.0
    df_out['short_mfe_0930'] = (df_out['price_at_0930'] - df_out['future_low']) / df_out['price_at_0930'] * 100.0
    
    total_inst = len(df_out)
    long_winners = df_out[df_out['long_mfe_0930'] >= 1.5]
    short_winners = df_out[df_out['short_mfe_0930'] >= 1.5]
    
    print(f"\n=======================================================")
    print(f" SESSION: {session_date} (Universe: {total_inst} stocks)")
    print(f"=======================================================")
    print(f" Long  >= 1.5% MFE opportunity pool:  {len(long_winners)} / {total_inst} ({len(long_winners)/total_inst*100:.1f}%)")
    print(f" Short >= 1.5% MFE opportunity pool: {len(short_winners)} / {total_inst} ({len(short_winners)/total_inst*100:.1f}%)")
    
    # Snapshot at 09:30 AM (UTC 04:00)
    feat_0930 = df_feat[df_feat['ts'] == pd.to_datetime(f"{session_date} 04:00:00+00:00")].copy()
    merged = pd.merge(feat_0930, df_out[['symbol', 'long_mfe_0930', 'short_mfe_0930']], on='symbol')
    
    # Top 5 RVOL at 09:30
    merged['rvol_val'] = merged['rvol'].fillna(0)
    top_rvol = merged.sort_values('rvol_val', ascending=False).head(5)
    print("\n Top 5 RVOL at 09:30 AM:")
    for _, row in top_rvol.iterrows():
        vwap_pos = "ABOVE_VWAP" if row['cash_close'] > row['session_vwap'] else "BELOW_VWAP"
        r_str = f"{row['rvol']:>5.2f}x" if pd.notnull(row['rvol']) else "  N/A "
        c_str = f"{row['clv']:>5.2f}" if pd.notnull(row['clv']) else "  N/A "
        l_str = f"{row['long_mfe_0930']:>+5.2f}%" if pd.notnull(row['long_mfe_0930']) else "  N/A "
        s_str = f"{row['short_mfe_0930']:>+5.2f}%" if pd.notnull(row['short_mfe_0930']) else "  N/A "
        print(f"   {row['symbol']:<12} RVOL: {r_str} | CLV: {c_str} | {vwap_pos:<10} | Long MFE: {l_str} | Short MFE: {s_str}")

    return merged

if __name__ == "__main__":
    print("Exploring Dark Age Sandbox: 7 Sessions (2026-07-13 to 2026-07-21)...")
    all_merged = []
    for day in EXPLORATION_DAYS:
        m = analyze_day(day)
        if m is not None:
            m['session_date'] = day
            all_merged.append(m)
            
    df_all = pd.concat(all_merged, ignore_index=True)
    print("\n" + "="*60)
    print(" 7-DAY SUMMARY OVERALL STATISTICS (At 09:30 AM)")
    print("="*60)
    print(f" Total Stock-Days: {len(df_all)}")
    print(f" Long Hit >= 1.5% MFE:  {(df_all['long_mfe_0930'] >= 1.5).sum()} / {len(df_all)} ({(df_all['long_mfe_0930'] >= 1.5).mean()*100:.1f}%)")
    print(f" Short Hit >= 1.5% MFE: {(df_all['short_mfe_0930'] >= 1.5).sum()} / {len(df_all)} ({(df_all['short_mfe_0930'] >= 1.5).mean()*100:.1f}%)")
