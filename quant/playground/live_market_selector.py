import subprocess
import json
import pandas as pd
import numpy as np

# Query the VM TimescaleDB directly
ssh_cmd = [
    "ssh", "manuj@148.230.66.138",
    "docker exec gidh-timescaledb psql -U postgres -d gidh_intraday -t -A -F ',' -c \""
    """
    WITH sma200_calc AS (
        SELECT 
            instrument_id,
            AVG(close) AS sma_200
        FROM (
            SELECT 
                instrument_id,
                close,
                ROW_NUMBER() OVER (PARTITION BY instrument_id ORDER BY session_date DESC) as rn
            FROM market.cash_candles_1d
            WHERE session_date <= '2026-09-16'
        ) sub
        WHERE rn <= 200
        GROUP BY instrument_id
        HAVING COUNT(*) >= 50
    ),
    live_candles AS (
        SELECT 
            instrument_id,
            (ARRAY_AGG(open ORDER BY ts ASC))[1] AS session_open,
            MAX(high) AS session_high,
            MIN(low) AS session_low,
            (ARRAY_AGG(close ORDER BY ts DESC))[1] AS live_close,
            SUM(volume) AS total_vol,
            SUM(close * volume) / NULLIF(SUM(volume), 0) AS live_vwap,
            MAX(CASE WHEN (ts AT TIME ZONE 'Asia/Kolkata')::time <= '09:30:00' THEN high END) AS orb15_high,
            MIN(CASE WHEN (ts AT TIME ZONE 'Asia/Kolkata')::time <= '09:30:00' THEN low END) AS orb15_low,
            COUNT(*) AS minutes_count
        FROM market.cash_candles_1m
        WHERE (ts AT TIME ZONE 'Asia/Kolkata')::date = '2026-09-17'
        GROUP BY instrument_id
    )
    SELECT 
        i.symbol,
        df.prior_close,
        df.prior_high,
        df.prior_low,
        df.cpr_pivot,
        df.cpr_bc,
        df.cpr_tc,
        ROUND((ABS(df.cpr_tc - df.cpr_bc) / df.cpr_pivot * 100)::numeric, 3) AS cpr_width_pct,
        df.atr_14,
        ROUND((df.atr_14 / df.prior_close * 100)::numeric, 2) AS atr_pct,
        df.adr_20,
        ROUND((df.adr_20 / df.prior_close * 100)::numeric, 2) AS adr_pct,
        df.sma_20,
        df.sma_50,
        ROUND(s200.sma_200::numeric, 2) AS sma_200,
        df.return_5d_pct,
        df.distance_20d_high_pct,
        df.distance_20d_low_pct,
        df.average_daily_volume_20,
        lc.session_open,
        lc.session_high,
        lc.session_low,
        lc.live_close,
        lc.total_vol,
        ROUND(lc.live_vwap::numeric, 2) AS live_vwap,
        lc.orb15_high,
        lc.orb15_low,
        lc.minutes_count
    FROM market.daily_features df
    JOIN market.instruments i ON df.instrument_id = i.id
    LEFT JOIN sma200_calc s200 ON df.instrument_id = s200.instrument_id
    LEFT JOIN live_candles lc ON df.instrument_id = lc.instrument_id
    WHERE df.feature_run_id = '949f0032-4365-46aa-8de8-f40d3afca307'
      AND i.is_active = TRUE
      AND df.prior_close BETWEEN 300 AND 5000
      AND df.average_daily_volume_20 >= 500000
      AND (df.adr_20 / df.prior_close * 100) >= 1.85;
    """
    "\""
]

res = subprocess.run(" ".join(ssh_cmd), shell=True, capture_output=True, text=True)
lines = [line.strip() for line in res.stdout.strip().split('\n') if line.strip()]

cols = [
    'symbol', 'prior_close', 'prior_high', 'prior_low', 'cpr_pivot', 'cpr_bc', 'cpr_tc',
    'cpr_width_pct', 'atr_14', 'atr_pct', 'adr_20', 'adr_pct', 'sma_20', 'sma_50', 'sma_200',
    'return_5d_pct', 'distance_20d_high_pct', 'distance_20d_low_pct', 'average_daily_volume_20',
    'session_open', 'session_high', 'session_low', 'live_close', 'total_vol', 'live_vwap',
    'orb15_high', 'orb15_low', 'minutes_count'
]

data = []
for line in lines:
    parts = line.split(',')
    if len(parts) == len(cols):
        data.append(parts)

df = pd.DataFrame(data, columns=cols)
for c in cols[1:]:
    df[c] = pd.to_numeric(df[c], errors='coerce')

# 1. Macro Regime Long Candidates (Triple Bullish Stack: Price > 20 >= 50 > 200)
long_mask = (
    (df['prior_close'] > df['sma_20']) &
    (df['sma_20'] >= df['sma_50']) &
    (df['prior_close'] > df['sma_200']) &
    (df['distance_20d_high_pct'] <= 4.5)
)
longs = df[long_mask].sort_values(by=['cpr_width_pct', 'distance_20d_high_pct']).head(5)

# 2. Macro Regime Short Candidates (Triple Bearish Stack: Price < 20 <= 50 < 200)
short_mask = (
    (df['prior_close'] < df['sma_20']) &
    (df['sma_20'] <= df['sma_50']) &
    (df['prior_close'] < df['sma_200']) &
    (df['distance_20d_low_pct'] <= 4.5)
)
shorts = df[short_mask].sort_values(by=['cpr_width_pct', 'distance_20d_low_pct']).head(5)

print("=========================================================================================")
print("=== TODAY'S PREMARKET WATCHLIST (Thursday, Sept 17, 2026) ===")
print("=========================================================================================")

print("\n>>> 🟢 TOP 5 LONG SETUPS (Triple Bullish Stack + Narrow CPR):")
print(longs[['symbol', 'prior_close', 'sma_20', 'sma_50', 'sma_200', 'cpr_width_pct', 'adr_pct', 'distance_20d_high_pct', 'return_5d_pct']].to_string(index=False))

print("\n>>> 🔴 TOP 5 SHORT SETUPS (Triple Bearish Stack + Narrow CPR):")
print(shorts[['symbol', 'prior_close', 'sma_20', 'sma_50', 'sma_200', 'cpr_width_pct', 'adr_pct', 'distance_20d_low_pct', 'return_5d_pct']].to_string(index=False))

print("\n=========================================================================================")
print("=== LIVE INTRADAY MARKET CONFIRMATION STATUS (09:15 - CURRENT) ===")
print("=========================================================================================")

all_selected = pd.concat([longs.assign(side='LONG'), shorts.assign(side='SHORT')])

all_selected['live_chg_%'] = round(((all_selected['live_close'] - all_selected['prior_close']) / all_selected['prior_close']) * 100, 2)
all_selected['vwap_pos'] = np.where(all_selected['live_close'] > all_selected['live_vwap'], 'ABOVE', 'BELOW')
all_selected['orb_break'] = np.where(
    all_selected['side'] == 'LONG',
    all_selected['live_close'] > all_selected['orb15_high'],
    all_selected['live_close'] < all_selected['orb15_low']
)

print(all_selected[['symbol', 'side', 'prior_close', 'session_open', 'live_close', 'live_vwap', 'vwap_pos', 'session_high', 'session_low', 'live_chg_%', 'minutes_count']].to_string(index=False))
