import sys
import pandas as pd
import numpy as np
from quant.base.db import get_db_connection

def inspect_stock(symbol, session_date="2026-08-25", conn=None):
    if conn is None:
        conn = get_db_connection()

    # 1. Fetch Daily Metadata & Features
    daily_sql = """
    WITH sma_data AS (
        SELECT 
            instrument_id,
            AVG(close) AS sma_200
        FROM (
            SELECT 
                instrument_id,
                close,
                ROW_NUMBER() OVER (PARTITION BY instrument_id ORDER BY session_date DESC) as rn
            FROM market.cash_candles_1d
            WHERE session_date <= %s
        ) sub
        WHERE rn <= 200
        GROUP BY instrument_id
    )
    SELECT 
        i.id AS instrument_id,
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
        ROUND(s.sma_200::numeric, 2) AS sma_200,
        df.return_5d_pct,
        df.distance_20d_high_pct,
        df.distance_20d_low_pct,
        df.average_daily_volume_20
    FROM market.daily_features df
    JOIN market.instruments i ON df.instrument_id = i.id
    JOIN market.feature_runs fr ON df.feature_run_id = fr.id
    LEFT JOIN sma_data s ON df.instrument_id = s.instrument_id
    WHERE i.symbol = %s AND fr.session_date = %s AND fr.status = 'SUCCEEDED';
    """
    
    df_meta = pd.read_sql(daily_sql, conn, params=(session_date, symbol, session_date))
    if df_meta.empty:
        print(f"[ERROR] Symbol '{symbol}' not found for session {session_date}")
        return

    m = df_meta.iloc[0]
    inst_id = int(m['instrument_id'])

    print(f"\n=========================================================================================")
    print(f"=== 🦅 GIDH DEEP INSPECTOR: {symbol} (Session: {session_date}) ===")
    print(f"=========================================================================================")
    print(f"Prior Close: ₹{m['prior_close']:.2f} | Prior Range: ₹{m['prior_low']:.2f} - ₹{m['prior_high']:.2f}")
    print(f"CPR Geometry: Pivot ₹{m['cpr_pivot']:.2f} | BC ₹{m['cpr_bc']:.2f} | TC ₹{m['cpr_tc']:.2f} (Width: {m['cpr_width_pct']}%)")
    print(f"Macro SMAs:   20 SMA: ₹{m['sma_20']:.2f} | 50 SMA: ₹{m['sma_50']:.2f} | 200 SMA: ₹{m['sma_200'] if m['sma_200'] else 0.0:.2f}")
    print(f"Volatility:   14 ATR: ₹{m['atr_14']:.2f} ({m['atr_pct']}%) | 20 ADR: ₹{m['adr_20']:.2f} ({m['adr_pct']}%)")
    print(f"Momentum:     5D Return: {m['return_5d_pct']:+.2f}% | Dist to 20D High: {m['distance_20d_high_pct']:.2f}% | Dist to 20D Low: {m['distance_20d_low_pct']:.2f}%")

    # 2. Intraday 1-Minute Performance & Profile from cash_candles_1m
    intra_sql = """
    SELECT 
        (c.ts AT TIME ZONE 'Asia/Kolkata')::time AS time_ist,
        c.open AS cash_open,
        c.high AS cash_high,
        c.low AS cash_low,
        c.close AS cash_close,
        c.volume,
        ROUND((SUM(c.close * c.volume) OVER (ORDER BY c.ts)) / NULLIF(SUM(c.volume) OVER (ORDER BY c.ts), 0)::numeric, 2) AS session_vwap
    FROM market.cash_candles_1m c
    WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = %s
      AND c.instrument_id = %s
    ORDER BY c.ts ASC;
    """
    df_intra = pd.read_sql(intra_sql, conn, params=(session_date, inst_id))

    if not df_intra.empty:
        day_open = df_intra.iloc[0]['cash_open']
        day_high = df_intra['cash_high'].max()
        day_low = df_intra['cash_low'].min()
        day_close = df_intra.iloc[-1]['cash_close']
        day_vol = df_intra['volume'].sum()
        net_pct = ((day_close - m['prior_close']) / m['prior_close']) * 100
        
        print(f"\n--- Intraday Outcome ({session_date}) ---")
        print(f"Open: ₹{day_open:.2f} | High: ₹{day_high:.2f} | Low: ₹{day_low:.2f} | Close: ₹{day_close:.2f}")
        print(f"Net Change: {net_pct:+.2f}% | Day Range: ₹{day_high - day_low:.2f} ({(day_high - day_low)/m['prior_close']*100:.2f}%) | Volume: {day_vol:,} shares")

        # 3. Volume Profile (Castles & Voids)
        df_intra['bucket'] = pd.cut(df_intra['cash_close'], bins=10)
        profile = df_intra.groupby('bucket', observed=False)['volume'].sum().reset_index()
        profile['share_%'] = round(profile['volume'] / profile['volume'].sum() * 100, 1)
        profile = profile.sort_values(by='bucket', ascending=False)
        
        print("\n--- Volume Profile Geography (Price Distribution) ---")
        for _, row in profile.iterrows():
            bar = "█" * int(row['share_%'] / 2)
            print(f"{str(row['bucket']):24} | {int(row['volume']):8,d} shares ({row['share_%']:4.1f}%) | {bar}")

if __name__ == "__main__":
    sym = sys.argv[1] if len(sys.argv) > 1 else "PAYTM"
    dt = sys.argv[2] if len(sys.argv) > 2 else "2026-08-25"
    inspect_stock(sym, dt)
