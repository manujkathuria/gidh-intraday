"""
🏛️ GIDH QUANT TOOL: STEP 1 MACRO FUTURES INFLOW & FUEL PIPELINE
Analyzes daily futures EOD settlement data to extract institutional campaign leaders.

Pipeline:
  1. Liquidity Band: ₹300 <= Close <= ₹7,000
  2. Institutional Inflow Gate: |Fresh Inflow| >= ₹40 Cr OR |OI Change| >= 3.5%
  3. Macro Fuel Gate: 3-Day Compression vs 10D ADR (Filters exhausted multi-day runs)
  4. Stance Vector & Composite Conviction Scoring (Top Bulls & Bears)
  5. Persistence into `quant.macro_daily_picks` table
"""

import sys
import argparse
import pandas as pd
import numpy as np
from quant.base.db import get_db_connection

def save_picks_to_db(session_date: str, longs: pd.DataFrame, shorts: pd.DataFrame, squeezes: pd.DataFrame, conn=None):
    """
    Persists the ranked focus candidates into `quant.macro_daily_picks`.
    """
    should_close = False
    if conn is None:
        conn = get_db_connection()
        should_close = True
        
    cur = conn.cursor()
    
    # Delete existing picks for this date
    cur.execute("DELETE FROM quant.macro_daily_picks WHERE session_date = %s", (session_date,))
    
    insert_sql = """
    INSERT INTO quant.macro_daily_picks (
        session_date, rank, symbol, stance, fut_close, price_1d_pct, oi_1d_pct,
        fresh_inflow_1d_cr, fresh_inflow_3d_cr, total_notional_cr, adr_10d, macro_fuel_pct, conviction_score
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (session_date, symbol) DO UPDATE SET
        rank = EXCLUDED.rank,
        stance = EXCLUDED.stance,
        fut_close = EXCLUDED.fut_close,
        price_1d_pct = EXCLUDED.price_1d_pct,
        oi_1d_pct = EXCLUDED.oi_1d_pct,
        fresh_inflow_1d_cr = EXCLUDED.fresh_inflow_1d_cr,
        fresh_inflow_3d_cr = EXCLUDED.fresh_inflow_3d_cr,
        total_notional_cr = EXCLUDED.total_notional_cr,
        adr_10d = EXCLUDED.adr_10d,
        macro_fuel_pct = EXCLUDED.macro_fuel_pct,
        conviction_score = EXCLUDED.conviction_score,
        created_at = NOW();
    """
    
    rank = 1
    # 1. Top Longs (up to 6)
    if longs is not None and not longs.empty:
        for _, r in longs.head(6).iterrows():
            cur.execute(insert_sql, (
                session_date, rank, r['symbol'], r['stance'], r['fut_close'],
                r['price_1d_pct'], r['oi_1d_pct'], r['fresh_inflow_1d_cr'],
                r['fresh_inflow_3d_cr'], r['total_notional_cr'], r['adr_10d'],
                r['macro_fuel_pct'], r['bull_score']
            ))
            rank += 1
            
    # 2. Top Shorts (up to 4)
    if shorts is not None and not shorts.empty:
        for _, r in shorts.head(4).iterrows():
            cur.execute(insert_sql, (
                session_date, rank, r['symbol'], r['stance'], r['fut_close'],
                r['price_1d_pct'], r['oi_1d_pct'], r['fresh_inflow_1d_cr'],
                r['fresh_inflow_3d_cr'], r['total_notional_cr'], r['adr_10d'],
                r['macro_fuel_pct'], r['bear_score']
            ))
            rank += 1
            
    # 3. Top Squeezes (up to 2)
    if squeezes is not None and not squeezes.empty:
        for _, r in squeezes.head(2).iterrows():
            cur.execute(insert_sql, (
                session_date, rank, r['symbol'], r['stance'], r['fut_close'],
                r['price_1d_pct'], r['oi_1d_pct'], r['fresh_inflow_1d_cr'],
                r['fresh_inflow_3d_cr'], r['total_notional_cr'], r['adr_10d'],
                r['macro_fuel_pct'], r['squeeze_score']
            ))
            rank += 1
            
    conn.commit()
    if should_close:
        conn.close()

def get_daily_macro_picks(session_date: str, auto_compute: bool = True) -> pd.DataFrame:
    """
    Retrieves the day's pre-computed Step 1 Macro focus picks from `quant.macro_daily_picks`.
    If not yet computed, automatically runs the Macro tool and returns the dataframe.
    """
    conn = get_db_connection()
    sql = """
    SELECT 
        rank, symbol, stance, fut_close, price_1d_pct, oi_1d_pct,
        fresh_inflow_1d_cr, fresh_inflow_3d_cr, total_notional_cr,
        adr_10d, macro_fuel_pct, conviction_score
    FROM quant.macro_daily_picks
    WHERE session_date = %s
    ORDER BY rank ASC;
    """
    df = pd.read_sql(sql, conn, params=[session_date])
    conn.close()
    
    if df.empty and auto_compute:
        res = run_macro_step1(session_date, save_to_db=True, verbose=False)
        return get_daily_macro_picks(session_date, auto_compute=False)
        
    return df

def run_macro_step1(target_date: str = "2026-09-08", min_inflow_cr: float = 40.0, min_oi_pct: float = 3.5, min_fuel_pct: float = 35.0, save_to_db: bool = True, verbose: bool = True) -> dict:
    """
    Executes Step 1 Macro screening on historical futures EOD settlement data.
    Returns a dict containing 'longs', 'shorts', 'squeezes', 'exhausted', and 'summary'.
    """
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
        -- Lags
        LAG(f1d.close, 1) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS prev_close,
        LAG(f1d.open_interest, 1) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS prev_oi,
        LAG(f1d.open_interest, 3) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS oi_3d_ago,
        -- 3-Day High / Low
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
        if verbose:
            print(f"❌ No futures data found for session date: {target_date}")
        return {}
    
    total_universe = len(df)
    
    # Cast numeric columns
    numeric_cols = ['fut_close', 'fut_oi', 'prev_close', 'prev_oi', 'adr_10d', 'high_3d', 'low_3d', 'range_3d', 'total_notional_cr', 'price_1d_pct', 'oi_1d_pct', 'fresh_inflow_1d_cr', 'fresh_inflow_3d_cr']
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0).astype(float)
            
    # 1. Gate 1: Liquidity Band Filter (₹300 - ₹7,000)
    df_stage1 = df[(df['fut_close'] >= 300.0) & (df['fut_close'] <= 7000.0)].copy()
    stage1_count = len(df_stage1)
    
    # 2. Gate 2: Institutional Inflow Gate
    inflow_mask = (
        (df_stage1['fresh_inflow_1d_cr'].abs() >= min_inflow_cr) | 
        (df_stage1['oi_1d_pct'].abs() >= min_oi_pct)
    )
    df_stage2 = df_stage1[inflow_mask].copy()
    stage2_count = len(df_stage2)
    
    # 3. Gate 3: Macro Fuel Gate (3D Range vs 10D ADR)
    df_stage2['adr_pct'] = (df_stage2['adr_10d'] / df_stage2['fut_close']) * 100.0
    df_stage2['fuel_burned_pct'] = np.clip((df_stage2['range_3d'] / (2.5 * df_stage2['adr_10d'])) * 100.0, 0, 100)
    df_stage2['macro_fuel_pct'] = 100.0 - df_stage2['fuel_burned_pct']
    
    df_stage3 = df_stage2[df_stage2['macro_fuel_pct'] >= min_fuel_pct].copy()
    stage3_count = len(df_stage3)
    exhausted = df_stage2[df_stage2['macro_fuel_pct'] < min_fuel_pct].copy()
    
    # 4. Gate 4: Stance & Conviction Scoring
    def classify_stance(row):
        p = row['price_1d_pct'] or 0.0
        oi = row['oi_1d_pct'] or 0.0
        inflow = row['fresh_inflow_1d_cr'] or 0.0
        
        if p >= 0.5 and (inflow >= min_inflow_cr or oi >= min_oi_pct):
            return "LONG BUILDUP"
        elif p <= -0.5 and (inflow >= min_inflow_cr or oi >= min_oi_pct):
            return "SHORT ATTACK"
        elif p >= 0.75 and oi <= -3.0:
            return "SHORT COVERING"
        elif p <= -0.75 and oi <= -3.0:
            return "LONG UNWINDING"
        else:
            return "NEUTRAL / CHOP"
            
    df_stage3['stance'] = df_stage3.apply(classify_stance, axis=1)
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
    
    # Persist into quant.macro_daily_picks
    if save_to_db:
        save_picks_to_db(target_date, longs, shorts, squeezes)
    
    if verbose:
        print("\n" + "=" * 105)
        print(f"       🏛️ GIDH QUANT TOOL: STEP 1 MACRO PIPELINE (SESSION: {target_date})")
        print("=" * 105)
        print(f"1. Total Universe:            {total_universe} Stocks")
        print(f"2. Stage 1 (Liquidity Band):  {stage1_count} Stocks (₹300 - ₹7,000)")
        print(f"3. Stage 2 (Inflow Gate):     {stage2_count} Stocks (≥₹{min_inflow_cr:.0f} Cr or ≥{min_oi_pct:.1f}% OI)")
        print(f"4. Stage 3 (Macro Fuel Gate): {stage3_count} Stocks Passed | {len(exhausted)} Filtered Out (Exhausted / Overstretched)")
        if save_to_db:
            print(f"5. DB Persistence:            Saved to `quant.macro_daily_picks` table (Instant 09:15 AM Micro Access)")
        print("-" * 105 + "\n")
        
        if len(exhausted) > 0:
            print("⚠️ EXHAUSTED STOCKS ELIMINATED BY MACRO FUEL GATE:")
            for _, r in exhausted.iterrows():
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
        
    return {
        "date": target_date,
        "universe_count": total_universe,
        "tradable_count": stage1_count,
        "inflow_passed_count": stage2_count,
        "fuel_passed_count": stage3_count,
        "longs": longs,
        "shorts": shorts,
        "squeezes": squeezes,
        "exhausted": exhausted
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Step 1 Macro Futures Inflow & Fuel Pipeline Tool")
    parser.add_argument("date", nargs="?", default="2026-09-08", help="Session Date (YYYY-MM-DD)")
    parser.add_argument("--inflow", type=float, default=40.0, help="Min 1D Inflow in ₹ Cr (default: 40.0)")
    parser.add_argument("--oi", type=float, default=3.5, help="Min 1D OI % change (default: 3.5)")
    parser.add_argument("--fuel", type=float, default=35.0, help="Min Macro Fuel % remaining (default: 35.0)")
    args = parser.parse_args()
    
    run_macro_step1(args.date, min_inflow_cr=args.inflow, min_oi_pct=args.oi, min_fuel_pct=args.fuel, save_to_db=True)
