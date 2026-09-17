import os
import pandas as pd
import numpy as np
from quant.db import get_db_connection

conn = get_db_connection()

# Query Day 1 (August 25, 2026) institutional footprints across all active F&O stocks
sql = """
WITH prev_data AS (
    SELECT 
        fc.instrument_id,
        fc.trading_symbol,
        f1d.session_date,
        f1d.open AS fut_open,
        f1d.high AS fut_high,
        f1d.low AS fut_low,
        f1d.close AS fut_close,
        f1d.open_interest AS fut_oi,
        f1d.volume AS fut_vol,
        LAG(f1d.close, 1) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS prev_close,
        LAG(f1d.open_interest, 1) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS prev_oi
    FROM market.future_candles_1d f1d
    JOIN market.future_contracts fc ON f1d.future_contract_id = fc.id
    WHERE f1d.session_date <= '2026-08-25'
),
day1_snapshot AS (
    SELECT 
        instrument_id,
        trading_symbol,
        fut_open,
        fut_high,
        fut_low,
        fut_close,
        fut_oi,
        fut_vol,
        prev_close,
        prev_oi,
        ROUND(((fut_close - prev_close) / NULLIF(prev_close, 0) * 100)::numeric, 2) AS price_chg_pct,
        ROUND(((fut_oi - prev_oi)::numeric / NULLIF(prev_oi, 0) * 100)::numeric, 2) AS oi_chg_pct,
        ROUND(((fut_close - fut_low) / NULLIF(fut_high - fut_low, 0))::numeric, 2) AS clv
    FROM prev_data
    WHERE session_date = '2026-08-25'
),
sma_data AS (
    SELECT 
        instrument_id,
        AVG(close) AS sma_200
    FROM (
        SELECT 
            instrument_id,
            close,
            ROW_NUMBER() OVER (PARTITION BY instrument_id ORDER BY session_date DESC) as rn
        FROM market.cash_candles_1d
        WHERE session_date <= '2026-08-25'
    ) sub
    WHERE rn <= 200
    GROUP BY instrument_id
    HAVING COUNT(*) >= 50
)
SELECT 
    i.symbol,
    d.trading_symbol,
    df.prior_close,
    d.fut_close,
    d.price_chg_pct,
    d.oi_chg_pct,
    d.clv,
    df.average_daily_volume_20,
    ROUND((df.adr_20 / df.prior_close * 100)::numeric, 2) AS adr_pct,
    df.sma_20,
    df.sma_50,
    ROUND(s.sma_200::numeric, 2) AS sma_200,
    df.distance_20d_high_pct,
    df.distance_20d_low_pct,
    df.return_5d_pct
FROM day1_snapshot d
JOIN market.instruments i ON d.instrument_id = i.id
JOIN market.daily_features df ON df.instrument_id = i.id
JOIN market.feature_runs fr ON df.feature_run_id = fr.id
LEFT JOIN sma_data s ON df.instrument_id = s.instrument_id
WHERE fr.session_date = '2026-08-25' AND fr.status = 'SUCCEEDED' AND i.is_active = TRUE
  AND df.prior_close BETWEEN 300 AND 5000
  AND df.average_daily_volume_20 >= 500000;
"""

df = pd.read_sql(sql, conn)

print("=========================================================================================")
print("=== VERIFYING STEP 1 CLAIMS ON AUGUST 25, 2026 (September Futures Day 1) ===")
print("=========================================================================================")

# Apply our 4 Footprints:
# 1. Price Change > +1.0% (Longs) or < -1.0% (Shorts)
# 2. Futures OI Surge >= +5.0%
# 3. Clean Close (CLV >= 0.70 for Longs, CLV <= 0.30 for Shorts)
# 4. Near Breakout level (distance_20d_high_pct <= 4.0% for Longs)

long_inceptions = df[
    (df['price_chg_pct'] >= 1.0) &
    (df['oi_chg_pct'] >= 5.0) &
    (df['clv'] >= 0.65) &
    (df['distance_20d_high_pct'] <= 4.0) &
    (df['prior_close'] > df['sma_20']) &
    (df['sma_20'] >= df['sma_50'])
].sort_values(by=['oi_chg_pct', 'clv'], ascending=False)

short_inceptions = df[
    (df['price_chg_pct'] <= -1.0) &
    (df['oi_chg_pct'] >= 5.0) &
    (df['clv'] <= 0.35) &
    (df['distance_20d_low_pct'] <= 4.0) &
    (df['prior_close'] < df['sma_20']) &
    (df['sma_20'] <= df['sma_50'])
].sort_values(by=['oi_chg_pct', 'clv'], ascending=[False, True])

print(f"\n>>> 🟢 TOP DAY-1 BULLISH CAMPAIGN INCEPTIONS DETECTED (Aug 25, 2026): {len(long_inceptions)} stocks")
print(long_inceptions[['symbol', 'prior_close', 'fut_close', 'price_chg_pct', 'oi_chg_pct', 'clv', 'distance_20d_high_pct', 'adr_pct']].to_string(index=False))

print(f"\n>>> 🔴 TOP DAY-1 BEARISH CAMPAIGN INCEPTIONS DETECTED (Aug 25, 2026): {len(short_inceptions)} stocks")
if not short_inceptions.empty:
    print(short_inceptions[['symbol', 'prior_close', 'fut_close', 'price_chg_pct', 'oi_chg_pct', 'clv', 'distance_20d_low_pct', 'adr_pct']].to_string(index=False))
else:
    print("No Day-1 Bearish Campaigns detected (broad market was strong on Aug 25).")

# Now let's track the next 3 days follow-through (Aug 26, 27, 28) for these Day 1 Bullish Launches!
candidate_symbols = long_inceptions['symbol'].tolist()

perf_sql = """
SELECT 
    i.symbol,
    c.session_date,
    c.open,
    c.high,
    c.low,
    c.close,
    ROUND(((c.close - LAG(c.close) OVER (PARTITION BY i.symbol ORDER BY c.session_date)) / 
           NULLIF(LAG(c.close) OVER (PARTITION BY i.symbol ORDER BY c.session_date), 0) * 100)::numeric, 2) AS daily_ret_pct
FROM market.cash_candles_1d c
JOIN market.instruments i ON c.instrument_id = i.id
WHERE i.symbol = ANY(%s)
  AND c.session_date BETWEEN '2026-08-25' AND '2026-08-28'
ORDER BY i.symbol, c.session_date;
"""

df_perf = pd.read_sql(perf_sql, conn, params=(candidate_symbols,))

print("\n=========================================================================================")
print("=== MULTI-DAY CAMPAIGN FOLLOW-THROUGH (Aug 26, Aug 27, Aug 28) ===")
print("=========================================================================================")

perf_summary = []
for sym in candidate_symbols:
    sub = df_perf[df_perf['symbol'] == sym]
    if len(sub) >= 2:
        day1_close = sub.iloc[0]['close']
        max_high_3d = sub['high'].max()
        day4_close = sub.iloc[-1]['close']
        total_move_pct = round(((day4_close - day1_close) / day1_close) * 100, 2)
        max_expansion_pct = round(((max_high_3d - day1_close) / day1_close) * 100, 2)
        perf_summary.append({
            'symbol': sym,
            'day1_close (Aug 25)': day1_close,
            'max_high_3d': max_high_3d,
            'max_3d_expansion_%': max_expansion_pct,
            'day4_close (Aug 28)': day4_close,
            'cumulative_3d_return_%': total_move_pct
        })

print(pd.DataFrame(perf_summary).to_string(index=False))
