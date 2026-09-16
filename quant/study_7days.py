"""
Detailed 7-Day Statistical Analysis (2026-07-13 to 2026-07-21)
Examines the relationship between 09:15-09:30 / 09:45 features and achieving >= 1.5% MFE by 15:00.
"""

import pandas as pd
import numpy as np
from config import get_connection

EXPLORATION_DAYS = [
    '2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16',
    '2026-07-17', '2026-07-20', '2026-07-21'
]

def load_7day_detailed_dataset():
    conn = get_connection()
    
    # Query: For every stock on each of the 7 days at 09:30 and 09:45:
    # 1. Feature snapshot (RVOL, CLV, VWAP distance, Gap %, Wick %, etc.)
    # 2. Forward MFE (Long & Short) until 15:00
    query = """
    WITH forward_outcome_0930 AS (
        SELECT 
            f.instrument_id,
            DATE(f.ts AT TIME ZONE 'Asia/Kolkata') as session_date,
            MAX(f.cash_high) as future_high_0930,
            MIN(f.cash_low) as future_low_0930
        FROM market.intraday_features_1m f
        WHERE f.ts >= '2026-07-13 04:00:00+00' AND f.ts <= '2026-07-21 09:30:00+00'
          AND (f.ts AT TIME ZONE 'Asia/Kolkata')::time >= '09:30:00'
          AND (f.ts AT TIME ZONE 'Asia/Kolkata')::time <= '15:00:00'
        GROUP BY f.instrument_id, DATE(f.ts AT TIME ZONE 'Asia/Kolkata')
    ),
    snapshot_0930 AS (
        SELECT 
            f.ts,
            DATE(f.ts AT TIME ZONE 'Asia/Kolkata') as session_date,
            i.symbol,
            f.instrument_id,
            f.cash_open,
            f.cash_high,
            f.cash_low,
            f.cash_close,
            f.session_open,
            f.session_vwap,
            f.vwap_distance_sigma,
            f.relative_volume as rvol,
            f.clv,
            f.opening_range_15_high as or15_high,
            f.opening_range_15_low as or15_low,
            f.upper_wick_pct,
            f.lower_wick_pct,
            (f.cash_close > f.session_vwap) as above_vwap,
            (f.cash_close >= f.opening_range_15_high) as break_or15_high,
            (f.cash_close <= f.opening_range_15_low) as break_or15_low,
            d.close as prev_day_close,
            ((f.session_open - d.close) / d.close * 100.0) as gap_pct
        FROM market.intraday_features_1m f
        JOIN market.instruments i ON i.id = f.instrument_id
        LEFT JOIN market.cash_candles_1d d 
            ON d.instrument_id = f.instrument_id 
            AND d.session_date = (
                SELECT MAX(session_date) FROM market.cash_candles_1d 
                WHERE instrument_id = f.instrument_id AND session_date < DATE(f.ts AT TIME ZONE 'Asia/Kolkata')
            )
        WHERE (f.ts AT TIME ZONE 'Asia/Kolkata')::time = '09:30:00'
          AND DATE(f.ts AT TIME ZONE 'Asia/Kolkata') IN ('2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17', '2026-07-20', '2026-07-21')
    )
    SELECT 
        s.*,
        o.future_high_0930,
        o.future_low_0930,
        ((o.future_high_0930 - s.cash_close) / s.cash_close * 100.0) as long_mfe_pct,
        ((s.cash_close - o.future_low_0930) / s.cash_close * 100.0) as short_mfe_pct
    FROM snapshot_0930 s
    JOIN forward_outcome_0930 o 
      ON o.instrument_id = s.instrument_id AND o.session_date = s.session_date;
    """
    
    df = pd.read_sql(query, conn)
    conn.close()
    return df

def run_study():
    df = load_7day_detailed_dataset()
    df['rvol_clean'] = df['rvol'].fillna(1.0)
    df['long_success'] = df['long_mfe_pct'] >= 1.5
    df['short_success'] = df['short_mfe_pct'] >= 1.5
    
    print("\n" + "="*70)
    print(" 7-DAY SANDBOX DETAILED STATISTICAL FINDINGS (N = 1,470 stock-sessions)")
    print("="*70)
    
    print("\n--- 1. OVERALL BASELINE ---")
    print(f"Total Observations: {len(df)}")
    print(f"Random Long Win Rate (Hit >= 1.5% MFE):  {df['long_success'].mean()*100:.1f}%")
    print(f"Random Short Win Rate (Hit >= 1.5% MFE): {df['short_success'].mean()*100:.1f}%")
    
    print("\n--- 2. IMPACT OF RELATIVE VOLUME (RVOL) AT 09:30 ---")
    rvol_bins = [0, 1.5, 3.0, 5.0, 10.0, 1000]
    labels = ['<1.5x (Low)', '1.5x-3.0x (Normal)', '3.0x-5.0x (High)', '5.0x-10.0x (Heavy)', '>10.0x (Massive)']
    df['rvol_tier'] = pd.cut(df['rvol_clean'], bins=rvol_bins, labels=labels)
    
    rvol_grp = df.groupby('rvol_tier', observed=True).agg(
        count=('symbol', 'count'),
        long_wr=('long_success', 'mean'),
        short_wr=('short_success', 'mean'),
        avg_long_mfe=('long_mfe_pct', 'mean'),
        avg_short_mfe=('short_mfe_pct', 'mean')
    )
    rvol_grp['long_wr'] *= 100
    rvol_grp['short_wr'] *= 100
    print(rvol_grp.to_string())

    print("\n--- 3. IMPACT OF VWAP ALIGNMENT AT 09:30 ---")
    vwap_grp = df.groupby('above_vwap').agg(
        count=('symbol', 'count'),
        long_wr=('long_success', 'mean'),
        short_wr=('short_success', 'mean'),
        avg_long_mfe=('long_mfe_pct', 'mean'),
        avg_short_mfe=('short_mfe_pct', 'mean')
    )
    vwap_grp['long_wr'] *= 100
    vwap_grp['short_wr'] *= 100
    print(vwap_grp.to_string())

    print("\n--- 4. IMPACT OF CLV (Close Location Value: -1.0 to +1.0) ---")
    df['clv_clean'] = df['clv'].fillna(0.0)
    clv_bins = [-1.01, -0.5, 0.0, 0.5, 1.01]
    clv_labels = ['Bottom 25% (Wick Down)', 'Lower Half', 'Upper Half', 'Top 25% (Closing High)']
    df['clv_tier'] = pd.cut(df['clv_clean'], bins=clv_bins, labels=clv_labels)
    clv_grp = df.groupby('clv_tier', observed=True).agg(
        count=('symbol', 'count'),
        long_wr=('long_success', 'mean'),
        short_wr=('short_success', 'mean')
    )
    clv_grp['long_wr'] *= 100
    clv_grp['short_wr'] *= 100
    print(clv_grp.to_string())

    print("\n--- 5. CONFLUENCE RULE TESTS (Testing Specific Setups) ---")
    # Setup 1: Strong Bull Trend (RVOL >= 3x, Above VWAP, CLV >= 0.5)
    s1 = df[(df['rvol_clean'] >= 3.0) & (df['above_vwap'] == True) & (df['clv_clean'] >= 0.5)]
    print(f"Setup 1 (Bull Displacement: RVOL >= 3x, Above VWAP, CLV >= 0.5):")
    print(f"   Count: {len(s1)} | Long Win Rate: {s1['long_success'].mean()*100:.1f}% | Avg Long MFE: {s1['long_mfe_pct'].mean():.2f}%")
    
    # Setup 2: Bear Breakdown / Wick Trap (RVOL >= 3x, Below VWAP, CLV <= 0.0)
    s2 = df[(df['rvol_clean'] >= 3.0) & (df['above_vwap'] == False) & (df['clv_clean'] <= 0.0)]
    print(f"Setup 2 (Bear Displacement: RVOL >= 3x, Below VWAP, CLV <= 0.0):")
    print(f"   Count: {len(s2)} | Short Win Rate: {s2['short_success'].mean()*100:.1f}% | Avg Short MFE: {s2['short_mfe_pct'].mean():.2f}%")

    # Setup 3: Extreme RVOL (RVOL >= 5x) + Sided Alignment
    s3_long = df[(df['rvol_clean'] >= 5.0) & (df['above_vwap'] == True)]
    s3_short = df[(df['rvol_clean'] >= 5.0) & (df['above_vwap'] == False)]
    print(f"Setup 3A (Heavy RVOL >= 5x + Above VWAP -> LONG):")
    print(f"   Count: {len(s3_long)} | Long Win Rate: {s3_long['long_success'].mean()*100:.1f}% | Avg Long MFE: {s3_long['long_mfe_pct'].mean():.2f}%")
    print(f"Setup 3B (Heavy RVOL >= 5x + Below VWAP -> SHORT):")
    print(f"   Count: {len(s3_short)} | Short Win Rate: {s3_short['short_success'].mean()*100:.1f}% | Avg Short MFE: {s3_short['short_mfe_pct'].mean():.2f}%")

if __name__ == "__main__":
    run_study()
