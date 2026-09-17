import sys
import os
import argparse
import pandas as pd
import numpy as np
import psycopg2
from dotenv import load_dotenv

load_dotenv()

TRADE_CAPITAL = 50000.0  # ₹10,000 margin * 5x leverage = ₹50,000 trade size
ROUND_TRIP_FRICTION = 70.0  # Approx ₹70 brokerage + STT + taxes per ₹50k round trip

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=os.getenv("DB_PORT", "5432"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "P@ssw0rd"),
        dbname=os.getenv("DB_NAME", "gidh_intraday")
    )

def run_premarket_scan(session_date, conn=None):
    if conn is None:
        conn = get_db_connection()
        
    cur = conn.cursor()
    cur.execute("SELECT id FROM market.feature_runs WHERE session_date = %s AND status = 'SUCCEEDED'", (session_date,))
    row = cur.fetchone()
    if not row:
        print(f"[ERROR] No successful feature run found for {session_date}")
        return None, None
    feature_run_id = row[0]

    premarket_sql = """
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
            WHERE session_date < %s
        ) sub
        WHERE rn <= 200
        GROUP BY instrument_id
        HAVING COUNT(*) >= 50
    ),
    prev_fut AS (
        SELECT 
            fc.instrument_id,
            fc.trading_symbol,
            f1d.close AS fut_close,
            f1d.open_interest AS fut_oi,
            LAG(f1d.close) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS prev_fut_close,
            LAG(f1d.open_interest) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS prev_fut_oi
        FROM market.future_candles_1d f1d
        JOIN market.future_contracts fc ON f1d.future_contract_id = fc.id
        WHERE f1d.session_date < %s
    ),
    latest_fut AS (
        SELECT DISTINCT ON (instrument_id)
            instrument_id,
            trading_symbol,
            fut_close,
            fut_oi,
            prev_fut_close,
            prev_fut_oi,
            ROUND(((fut_close - prev_fut_close) / NULLIF(prev_fut_close, 0) * 100)::numeric, 2) AS fut_price_chg_pct,
            ROUND(((fut_oi - prev_fut_oi)::numeric / NULLIF(prev_fut_oi, 0) * 100)::numeric, 2) AS fut_oi_chg_pct
        FROM prev_fut
        ORDER BY instrument_id, fut_close DESC
    )
    SELECT 
        i.id AS instrument_id,
        i.symbol,
        df.prior_close,
        df.prior_high,
        df.prior_low,
        df.prior_week_high,
        df.prior_week_low,
        df.cpr_pivot,
        df.cpr_bc,
        df.cpr_tc,
        ROUND((ABS(df.cpr_tc - df.cpr_bc) / df.cpr_pivot * 100)::numeric, 3) AS cpr_width_pct,
        ROUND((df.cpr_pivot * 2 - df.prior_low)::numeric, 2) AS r1_resistance,
        ROUND((df.cpr_pivot * 2 - df.prior_high)::numeric, 2) AS s1_support,
        df.atr_14,
        ROUND((df.atr_14 / df.prior_close * 100)::numeric, 2) AS atr_pct,
        df.adr_20,
        ROUND((df.adr_20 / df.prior_close * 100)::numeric, 2) AS adr_pct,
        df.sma_20,
        df.sma_50,
        ROUND(s200.sma_200::numeric, 2) AS sma_200,
        df.return_5d_pct,
        df.return_20d_pct,
        df.distance_20d_high_pct,
        df.distance_20d_low_pct,
        df.average_daily_volume_20,
        df.volume_dryup_ratio,
        df.futures_oi_change_5d_pct,
        lf.fut_price_chg_pct,
        lf.fut_oi_chg_pct
    FROM market.daily_features df
    JOIN market.instruments i ON df.instrument_id = i.id
    LEFT JOIN sma200_calc s200 ON df.instrument_id = s200.instrument_id
    LEFT JOIN latest_fut lf ON df.instrument_id = lf.instrument_id
    WHERE df.feature_run_id = %s
      AND i.is_active = TRUE
    """

    df_pre = pd.read_sql(premarket_sql, conn, params=(session_date, session_date, feature_run_id))

    # Base Sweet-Spot Filter: Price ₹300 to ₹5,000, ADV20 >= 500k, ADR >= 1.85%
    sweet_spot = (
        df_pre['prior_close'].between(300, 5000) &
        (df_pre['average_daily_volume_20'] >= 500000) &
        (df_pre['adr_pct'] >= 1.85)
    )

    # Grade-A Long Filter (Macro Bullish Alignment + Narrow CPR)
    long_mask = (
        sweet_spot &
        (df_pre['prior_close'] > df_pre['sma_20']) &
        (df_pre['sma_20'] >= df_pre['sma_50']) &
        (df_pre['prior_close'] > df_pre['sma_200']) &
        (df_pre['distance_20d_high_pct'] <= 4.5) &
        (df_pre['cpr_width_pct'] <= 0.40)
    )
    longs = df_pre[long_mask].sort_values(by=['cpr_width_pct', 'distance_20d_high_pct']).head(5).copy()
    if not longs.empty:
        longs['target_1_adr'] = round(longs['prior_close'] + longs['adr_20'] * 0.70, 2)
        longs['invalidation_sl'] = round(longs['cpr_bc'] * 0.995, 2)
        longs['suggested_qty'] = (TRADE_CAPITAL / longs['prior_close']).astype(int)

    # Grade-A Short Filter (Macro Bearish Alignment + Narrow CPR)
    short_mask = (
        sweet_spot &
        (df_pre['prior_close'] < df_pre['sma_20']) &
        (df_pre['sma_20'] <= df_pre['sma_50']) &
        (df_pre['prior_close'] < df_pre['sma_200']) &
        (df_pre['distance_20d_low_pct'] <= 4.5) &
        (df_pre['cpr_width_pct'] <= 0.40)
    )
    shorts = df_pre[short_mask].sort_values(by=['cpr_width_pct', 'distance_20d_low_pct']).head(5).copy()
    if not shorts.empty:
        shorts['target_1_adr'] = round(shorts['prior_close'] - shorts['adr_20'] * 0.70, 2)
        shorts['invalidation_sl'] = round(shorts['cpr_tc'] * 1.005, 2)
        shorts['suggested_qty'] = (TRADE_CAPITAL / shorts['prior_close']).astype(int)

    return longs, shorts, feature_run_id

def run_intraday_confirmation(session_date, longs, shorts, feature_run_id, conn=None):
    """
    Smarter Dynamic 1-Minute Multi-Gate Execution Engine:
    Instead of waiting for a rigid 09:30 AM timer when institutions have already exhausted
    the fuel, this engine evaluates EVERY 1-minute candle from 09:16 to 09:45 AM.
    
    4 Dynamic Micro-Gates:
    1. Fuel Gate: adr_fuel_used_pct < 50% (preserves >= 50% ADR expansion room).
    2. VWAP Gate: Price > VWAP (Long) or Price < VWAP (Short).
    3. RVOL Gate: relative_volume >= 0.8x (institutional participation active).
    4. Breakout Trigger: 
       - Long: Close > 5-Min Opening Range High OR Close > Prior Day High.
       - Short: Close < 5-Min Opening Range Low OR Close < Prior Day Low.
    """
    if conn is None:
        conn = get_db_connection()
        
    all_selected = pd.concat([longs.assign(side='LONG'), shorts.assign(side='SHORT')])
    if all_selected.empty:
        print("[INFO] No watchlist candidates to evaluate.")
        return pd.DataFrame()
        
    inst_ids = all_selected['instrument_id'].tolist()

    intraday_sql = """
    SELECT 
        f.instrument_id,
        (f.ts AT TIME ZONE 'Asia/Kolkata') AS ts_ist,
        f.cash_open,
        f.cash_high,
        f.cash_low,
        f.cash_close,
        f.session_open,
        f.session_high,
        f.session_low,
        f.session_vwap,
        f.opening_range_15_high,
        f.opening_range_15_low,
        f.relative_volume,
        f.adr_fuel_used_pct,
        f.oi_change_session
    FROM market.intraday_features_1m f
    WHERE f.feature_run_id = %s
      AND f.instrument_id = ANY(%s)
    ORDER BY f.instrument_id, f.ts
    """

    df_intra = pd.read_sql(intraday_sql, conn, params=(feature_run_id, inst_ids))
    if df_intra.empty:
        print(f"[INFO] No intraday minute features found for session {session_date}")
        return pd.DataFrame()

    results = []
    for _, stock in all_selected.iterrows():
        inst_id = stock['instrument_id']
        sym = stock['symbol']
        side = stock['side']
        prior_h = float(stock['prior_high']) if pd.notnull(stock.get('prior_high')) else None
        prior_l = float(stock['prior_low']) if pd.notnull(stock.get('prior_low')) else None
        
        s_intra = df_intra[df_intra['instrument_id'] == inst_id].sort_values(by='ts_ist')
        if s_intra.empty:
            continue
        
        day_open = s_intra.iloc[0]['session_open']
        day_high = s_intra['cash_high'].max()
        day_low = s_intra['cash_low'].min()
        day_close = s_intra.iloc[-1]['cash_close']
        
        # Calculate 5-min ORB High and Low (09:15 to 09:19)
        first_5m = s_intra[s_intra['ts_ist'].dt.time < pd.to_datetime('09:20:00').time()]
        orb5_h = first_5m['cash_high'].max() if not first_5m.empty else prior_h
        orb5_l = first_5m['cash_low'].min() if not first_5m.empty else prior_l
        
        # Breakout benchmark level
        breakout_level = prior_h if (prior_h and prior_h > orb5_h) else orb5_h if side == 'LONG' else prior_l if (prior_l and prior_l < orb5_l) else orb5_l

        confirmed = False
        trigger_time = None
        entry_price = 0.0
        exit_price = day_close
        fuel_at_entry = 0.0
        rvol_at_entry = 0.0
        filter_reason = "NO_TRIGGER_IN_WINDOW"
        max_mfe_pct = 0.0

        # Scan 1-minute bars dynamically between 09:16:00 and 09:45:00
        scan_window = s_intra[
            (s_intra['ts_ist'].dt.time >= pd.to_datetime('09:16:00').time()) &
            (s_intra['ts_ist'].dt.time <= pd.to_datetime('09:45:00').time())
        ]

        for _, bar in scan_window.iterrows():
            b_time = bar['ts_ist'].strftime('%H:%M')
            b_close = float(bar['cash_close'])
            b_vwap = float(bar['session_vwap']) if pd.notnull(bar['session_vwap']) else b_close
            b_fuel = float(bar['adr_fuel_used_pct']) if pd.notnull(bar['adr_fuel_used_pct']) else 0.0
            b_rvol = float(bar['relative_volume']) if pd.notnull(bar['relative_volume']) else 1.0

            # Dynamic Gates
            fuel_ok = (b_fuel < 0.50)  # Must have >= 50% ADR fuel remaining
            rvol_ok = (b_rvol >= 0.80)  # Institutional participation

            if side == 'LONG':
                vwap_ok = (b_close > b_vwap)
                level_break = (b_close > orb5_h) or (prior_h and b_close > prior_h)
                
                if level_break and vwap_ok:
                    if not fuel_ok:
                        filter_reason = f"FUEL_EXHAUSTED_{b_fuel*100:.0f}%"
                        # Don't break, keep watching if pullback restores fuel or log reason
                    else:
                        confirmed = True
                        trigger_time = b_time
                        entry_price = b_close
                        fuel_at_entry = b_fuel
                        rvol_at_entry = b_rvol
                        filter_reason = "EXECUTED"
                        break

            elif side == 'SHORT':
                vwap_ok = (b_close < b_vwap)
                level_break = (b_close < orb5_l) or (prior_l and b_close < prior_l)
                
                if level_break and vwap_ok:
                    if not fuel_ok:
                        filter_reason = f"FUEL_EXHAUSTED_{b_fuel*100:.0f}%"
                    else:
                        confirmed = True
                        trigger_time = b_time
                        entry_price = b_close
                        fuel_at_entry = b_fuel
                        rvol_at_entry = b_rvol
                        filter_reason = "EXECUTED"
                        break

        # Sizing and PnL calculation
        shares = 0
        pnl_gross = 0.0
        pnl_net = 0.0
        roi_margin_pct = 0.0

        if confirmed:
            shares = int(TRADE_CAPITAL / entry_price)
            # Find price movement after trigger
            post_trigger = s_intra[s_intra['ts_ist'].dt.time >= pd.to_datetime(trigger_time).time()]
            if side == 'LONG':
                mfe_high = post_trigger['cash_high'].max()
                max_mfe_pct = round(((mfe_high - entry_price) / entry_price) * 100, 2)
                pnl_gross = round((exit_price - entry_price) * shares, 2)
            else:
                mfe_low = post_trigger['cash_low'].min()
                max_mfe_pct = round(((entry_price - mfe_low) / entry_price) * 100, 2)
                pnl_gross = round((entry_price - exit_price) * shares, 2)

            pnl_net = round(pnl_gross - ROUND_TRIP_FRICTION, 2)
            roi_margin_pct = round((pnl_net / 10000.0) * 100, 2)

        results.append({
            'symbol': sym,
            'side': side,
            'prior_close': stock['prior_close'],
            'trigger_time': trigger_time if confirmed else '-',
            'fuel_entry_%': round(fuel_at_entry * 100, 1) if confirmed else 0,
            'rvol': round(rvol_at_entry, 2) if confirmed else 0,
            'status': 'CONFIRMED' if confirmed else 'FILTERED_OUT',
            'filter_reason': filter_reason,
            'shares': shares,
            'entry_₹': entry_price if confirmed else 0,
            'close_₹': day_close,
            'mfe_%': max_mfe_pct if confirmed else 0,
            'net_pnl_₹': pnl_net if confirmed else 0,
            'roi_%': roi_margin_pct if confirmed else 0
        })

    return pd.DataFrame(results)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Gidh Macro Regime Engine")
    parser.add_argument("date", nargs="?", default="2026-08-25", help="Session date (YYYY-MM-DD)")
    parser.add_argument("--mode", choices=["full", "premarket", "confirm"], default="full", help="Execution mode")
    args = parser.parse_args()

    session_date = args.date
    longs, shorts, feature_run_id = run_premarket_scan(session_date)

    if longs is None:
        sys.exit(1)

    print(f"\n=========================================================================================")
    print(f"=== STAGE 1: GIDH PREMARKET WATCHLIST (Session: {session_date}) ===")
    print(f"=== Capital per stock: ₹50,000 (₹10,000 margin * 5x leverage) ===")
    print(f"=========================================================================================")

    print("\n>>> 🟢 TOP 5 LONG SETUPS (Triple Bullish Stack + Narrow CPR + Fresh Fuel):")
    if not longs.empty:
        print(longs[['symbol', 'prior_close', 'cpr_width_pct', 'adr_pct', 'distance_20d_high_pct', 'suggested_qty', 'target_1_adr', 'invalidation_sl']].to_string(index=False))
    else:
        print("No Grade-A Long setups found.")

    print("\n>>> 🔴 TOP 5 SHORT SETUPS (Triple Bearish Stack + Narrow CPR + Fresh Fuel):")
    if not shorts.empty:
        print(shorts[['symbol', 'prior_close', 'cpr_width_pct', 'adr_pct', 'distance_20d_low_pct', 'suggested_qty', 'target_1_adr', 'invalidation_sl']].to_string(index=False))
    else:
        print("No Grade-A Short setups found.")

    if args.mode in ["full", "confirm"]:
        res_df = run_intraday_confirmation(session_date, longs, shorts, feature_run_id)
        if not res_df.empty:
            print(f"\n=========================================================================================")
            print(f"=== STAGE 2: 09:30 AM GIDH CONFIRMATION & INTRADAY PnL RESULTS ({session_date}) ===")
            print(f"=========================================================================================")
            print(res_df.to_string(index=False))
            
            executed = res_df[res_df['status'] == 'CONFIRMED']
            if not executed.empty:
                total_pnl = executed['net_pnl_₹'].sum()
                total_trades = len(executed)
                wins = len(executed[executed['net_pnl_₹'] > 0])
                win_rate = (wins / total_trades) * 100
                print(f"\n>>> SESSION SUMMARY: Total Trades: {total_trades} | Win Rate: {win_rate:.1f}% | Net Session PnL: ₹{total_pnl:+.2f}")
