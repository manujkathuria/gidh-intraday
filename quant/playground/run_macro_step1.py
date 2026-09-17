"""
Quant Step 1: Institutional Macro Futures Pipeline
Sequence:
  1. Liquidity Filter (Price ₹300 - ₹7,000)
  2. Institutional Inflow Gate (Fresh Inflow ₹ Cr & OI Expansion)
  3. Macro Fuel Gate (3-Day Compression vs 10D ADR - Filter Exhausted Stocks)
  4. Stance & Directional Selection (Longs vs Shorts vs Squeezes)
"""

import sys
import pandas as pd
import numpy as np
from quant.base.db import get_db_connection

def run_step1_macro_pipeline(target_date: str = "2026-09-08"):
    conn = get_db_connection()
    
    query = """
    WITH fut_history AS (
      SELECT 
        fc.instrument_id,
        fc.trading_symbol,
        f1d.session_date,
        f1d.high::float AS high,
        f1d.low::float AS low,
        f1d.close::float AS close,
        f1d.open_interest::float AS oi,
        -- 1D Lag
        LAG(f1d.close, 1) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS prev_close,
        LAG(f1d.open_interest, 1) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS prev_oi,
        -- 3D Lag
        LAG(f1d.open_interest, 3) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS oi_3d_ago,
        -- 3D High / Low
        MAX(f1d.high) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS high_3d,
        MIN(f1d.low) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS low_3d,
        -- 10D ADR (Average Daily Range)
        AVG(f1d.high - f1d.low) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date ROWS BETWEEN 9 PRECEDING AND CURRENT ROW) AS adr_10d
      FROM market.future_candles_1d f1d
      JOIN market.future_contracts fc ON f1d.future_contract_id = fc.id
      WHERE f1d.session_date <= %s
    ),
    target_session AS (
      SELECT 
        instrument_id,
        trading_symbol,
        session_date,
        close AS fut_close,
        oi AS fut_oi,
        prev_close,
        prev_oi,
        adr_10d,
        high_3d,
        low_3d,
        (high_3d - low_3d) AS range_3d,
        (close * oi / 10000000.0) AS total_notional_cr,
        ((close - prev_close) / NULLIF(prev_close, 0) * 100.0) AS price_1d_pct,
        ((oi - prev_oi) / NULLIF(prev_oi, 0) * 100.0) AS oi_1d_pct,
        ((oi - prev_oi) * close / 10000000.0) AS fresh_inflow_1d_cr,
        ((oi - oi_3d_ago) * close / 10000000.0) AS fresh_inflow_3d_cr
      FROM fut_history
      WHERE session_date = %s
    )
    SELECT 
      i.symbol,
      ts.*
    FROM target_session ts
    JOIN market.instruments i ON ts.instrument_id = i.id
    ORDER BY ts.fresh_inflow_1d_cr DESC NULLS LAST;
    """
    
    cur = conn.cursor()
    cur.execute(query, [target_date, target_date])
    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    df = pd.DataFrame(rows, columns=columns)
    conn.close()
    
    if df.empty:
        print(f"No futures data found for session date: {target_date}")
        return
    
    total_universe = len(df)
    
    numeric_cols = ['fut_close', 'fut_oi', 'prev_close', 'prev_oi', 'adr_10d', 'high_3d', 'low_3d', 'range_3d', 'total_notional_cr', 'price_1d_pct', 'oi_1d_pct', 'fresh_inflow_1d_cr', 'fresh_inflow_3d_cr']
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0).astype(float)
    
    # -------------------------------------------------------------
    # STAGE 1: LIQUIDITY FILTER (Price ₹300 to ₹7,000)
    # -------------------------------------------------------------
    df_stage1 = df[(df['fut_close'] >= 300.0) & (df['fut_close'] <= 7000.0)].copy()
    stage1_count = len(df_stage1)
    
    # -------------------------------------------------------------
    # STAGE 2: INSTITUTIONAL INFLOW GATE
    # -------------------------------------------------------------
    # Active inflow (or covering outflow)
    inflow_mask = (
        (df_stage1['fresh_inflow_1d_cr'].abs() >= 40.0) | 
        (df_stage1['oi_1d_pct'].abs() >= 3.5)
    )
    df_stage2 = df_stage1[inflow_mask].copy()
    stage2_count = len(df_stage2)
    
    # -------------------------------------------------------------
    # STAGE 3: MACRO FUEL GATE (3D Compression vs 10D ADR)
    # -------------------------------------------------------------
    # Compute ADR % and Fuel Remaining
    df_stage2['adr_pct'] = (df_stage2['adr_10d'] / df_stage2['fut_close']) * 100.0
    # Range Expansion Factor = 3-Day Range / (2.5 * ADR)
    # If 3D range is small (e.g. 1.2 * ADR), Expansion Factor is ~0.48 -> Fuel is ~52% (Full/Coiled)
    # If 3D range is huge (e.g. 4.0 * ADR), Expansion Factor is 1.6 -> Fuel is 0% (Exhausted)
    df_stage2['fuel_burned_pct'] = np.clip((df_stage2['range_3d'] / (2.5 * df_stage2['adr_10d'])) * 100.0, 0, 100)
    df_stage2['macro_fuel_pct'] = 100.0 - df_stage2['fuel_burned_pct']
    
    # Fuel Gate Filter: Must have at least 35% Macro Fuel remaining
    df_stage3 = df_stage2[df_stage2['macro_fuel_pct'] >= 35.0].copy()
    stage3_count = len(df_stage3)
    exhausted_stocks = df_stage2[df_stage2['macro_fuel_pct'] < 35.0]
    
    # -------------------------------------------------------------
    # STAGE 4: STANCE CLASSIFICATION & CONVICTION RANKING
    # -------------------------------------------------------------
    def classify_stance(row):
        p = row['price_1d_pct'] or 0.0
        oi = row['oi_1d_pct'] or 0.0
        inflow = row['fresh_inflow_1d_cr'] or 0.0
        
        if p >= 0.5 and (inflow >= 40.0 or oi >= 3.5):
            return "LONG BUILDUP"
        elif p <= -0.5 and (inflow >= 40.0 or oi >= 3.5):
            return "SHORT ATTACK"
        elif p >= 0.75 and oi <= -3.0:
            return "SHORT COVERING"
        elif p <= -0.75 and oi <= -3.0:
            return "LONG UNWINDING"
        else:
            return "NEUTRAL / CHOP"
            
    df_stage3['stance'] = df_stage3.apply(classify_stance, axis=1)
    
    # Conviction Scores (Weighted by remaining Macro Fuel)
    fuel_multiplier = df_stage3['macro_fuel_pct'] / 100.0
    
    df_stage3['bull_score'] = (
        (np.maximum(df_stage3['fresh_inflow_1d_cr'], 0) * 0.4 +
         np.maximum(df_stage3['oi_1d_pct'], 0) * 2.5 +
         np.maximum(df_stage3['price_1d_pct'], 0) * 8.0 +
         np.maximum(df_stage3['fresh_inflow_3d_cr'], 0) * 0.15) * fuel_multiplier
    )
    
    df_stage3['bear_score'] = (
        (np.maximum(df_stage3['fresh_inflow_1d_cr'], 0) * 0.4 +
         np.maximum(df_stage3['oi_1d_pct'], 0) * 2.5 +
         np.maximum(-df_stage3['price_1d_pct'], 0) * 8.0 +
         np.maximum(df_stage3['fresh_inflow_3d_cr'], 0) * 0.15) * fuel_multiplier
    )
    
    df_stage3['squeeze_score'] = (
        (np.maximum(df_stage3['price_1d_pct'], 0) * 8.0 +
         np.maximum(-df_stage3['oi_1d_pct'], 0) * 3.0 +
         np.maximum(-df_stage3['fresh_inflow_1d_cr'], 0) * 0.3) * fuel_multiplier
    )
    
    longs = df_stage3[df_stage3['stance'] == 'LONG BUILDUP'].sort_values('bull_score', ascending=False)
    shorts = df_stage3[df_stage3['stance'] == 'SHORT ATTACK'].sort_values('bear_score', ascending=False)
    squeezes = df_stage3[df_stage3['stance'] == 'SHORT COVERING'].sort_values('squeeze_score', ascending=False)
    
    print("\n" + "=" * 105)
    print(f"       GIDH QUANT FACTORY: STEP 1 MACRO PIPELINE (SESSION: {target_date})")
    print("=" * 105)
    print(f"1. Total Universe:            {total_universe} Stocks")
    print(f"2. Stage 1 (Liquidity Band):  {stage1_count} Stocks (₹300 - ₹7,000)")
    print(f"3. Stage 2 (Inflow Gate):     {stage2_count} Stocks (≥₹40 Cr or ≥3.5% OI)")
    print(f"4. Stage 3 (Macro Fuel Gate): {stage3_count} Stocks Passed | {len(exhausted_stocks)} Filtered Out (Exhausted / Overstretched)")
    print("-" * 105 + "\n")
    
    if len(exhausted_stocks) > 0:
        print("⚠️ EXHAUSTED STOCKS ELIMINATED BY MACRO FUEL GATE:")
        for _, r in exhausted_stocks.iterrows():
            print(f"  • {r['symbol']:<12} Price: ₹{r['fut_close']:<8.2f} (1D: {r['price_1d_pct']:>+5.2f}%) | 3D Range: ₹{r['range_3d']:.1f} vs ADR: ₹{r['adr_10d']:.1f} | Macro Fuel: {r['macro_fuel_pct']:.0f}% (BURNT)")
        print()
        
    print(f"★ TOP BULLISH CANDIDATES (Fuel-Confirmed Longs):")
    print(f"{'#':<3} {'Symbol':<12} {'Price (₹)':<10} {'1D Move':<10} {'1D Inflow':<14} {'10D ADR':<12} {'Macro Fuel':<14} {'Score'}")
    print("-" * 105)
    for idx, (_, r) in enumerate(longs.head(6).iterrows(), 1):
        print(f"{idx:<3} {r['symbol']:<12} ₹{r['fut_close']:<9.2f} {r['price_1d_pct']:>+6.2f}%    ₹{r['fresh_inflow_1d_cr']:>+7.1f} Cr    ₹{r['adr_10d']:<5.1f} ({r['adr_pct']:.1f}%)   {r['macro_fuel_pct']:>5.0f}% Fuel       {r['bull_score']:>6.1f}")
        
    print(f"\n★ TOP BEARISH / SQUEEZE CANDIDATES (Fuel-Confirmed Shorts & Squeezes):")
    print(f"{'#':<3} {'Symbol':<12} {'Price (₹)':<10} {'1D Move':<10} {'1D Inflow':<14} {'10D ADR':<12} {'Macro Fuel':<14} {'Stance':<14} {'Score'}")
    print("-" * 105)
    count = 1
    for _, r in shorts.head(4).iterrows():
        print(f"{count:<3} {r['symbol']:<12} ₹{r['fut_close']:<9.2f} {r['price_1d_pct']:>+6.2f}%    ₹{r['fresh_inflow_1d_cr']:>+7.1f} Cr    ₹{r['adr_10d']:<5.1f} ({r['adr_pct']:.1f}%)   {r['macro_fuel_pct']:>5.0f}% Fuel       {'SHORT ATTACK':<14} {r['bear_score']:>6.1f}")
        count += 1
        
    for _, r in squeezes.head(2).iterrows():
        print(f"{count:<3} {r['symbol']:<12} ₹{r['fut_close']:<9.2f} {r['price_1d_pct']:>+6.2f}%    ₹{r['fresh_inflow_1d_cr']:>+7.1f} Cr    ₹{r['adr_10d']:<5.1f} ({r['adr_pct']:.1f}%)   {r['macro_fuel_pct']:>5.0f}% Fuel       {'SHORT SQUEEZE':<14} {r['squeeze_score']:>6.1f}")
        count += 1
        
    print("\n" + "=" * 105 + "\n")

if __name__ == "__main__":
    date = sys.argv[1] if len(sys.argv) > 1 else "2026-09-08"
    run_step1_macro_pipeline(date)
