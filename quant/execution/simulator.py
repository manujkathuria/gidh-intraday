import pandas as pd
from quant.base.db import get_db_connection, DEFAULT_TRADE_CAPITAL, DEFAULT_ROUND_TRIP_FRICTION, DEFAULT_MARGIN_PER_SLOT

def simulate_session_execution(session_date: str, longs: pd.DataFrame, shorts: pd.DataFrame, feature_run_id: int, conn=None) -> pd.DataFrame:
    """
    Simulates dynamic 1-minute execution from 09:16 to 09:45 AM.
    """
    if conn is None:
        conn = get_db_connection()
        
    all_selected = pd.concat([longs.assign(side='LONG'), shorts.assign(side='SHORT')])
    if all_selected.empty:
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
        
        first_5m = s_intra[s_intra['ts_ist'].dt.time < pd.to_datetime('09:20:00').time()]
        orb5_h = first_5m['cash_high'].max() if not first_5m.empty else prior_h
        orb5_l = first_5m['cash_low'].min() if not first_5m.empty else prior_l

        confirmed = False
        trigger_time = None
        entry_price = 0.0
        exit_price = day_close
        fuel_at_entry = 0.0
        rvol_at_entry = 0.0
        filter_reason = "NO_TRIGGER_IN_WINDOW"
        max_mfe_pct = 0.0

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

            fuel_ok = (b_fuel < 0.50)
            rvol_ok = (b_rvol >= 0.80)

            if side == 'LONG':
                vwap_ok = (b_close > b_vwap)
                level_break = (b_close > orb5_h) or (prior_h and b_close > prior_h)
                
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

        shares = 0
        pnl_gross = 0.0
        pnl_net = 0.0
        roi_margin_pct = 0.0

        if confirmed:
            shares = int(DEFAULT_TRADE_CAPITAL / entry_price)
            post_trigger = s_intra[s_intra['ts_ist'].dt.time >= pd.to_datetime(trigger_time).time()]
            if side == 'LONG':
                mfe_high = post_trigger['cash_high'].max()
                max_mfe_pct = round(((mfe_high - entry_price) / entry_price) * 100, 2)
                pnl_gross = round((exit_price - entry_price) * shares, 2)
            else:
                mfe_low = post_trigger['cash_low'].min()
                max_mfe_pct = round(((entry_price - mfe_low) / entry_price) * 100, 2)
                pnl_gross = round((entry_price - exit_price) * shares, 2)

            pnl_net = round(pnl_gross - DEFAULT_ROUND_TRIP_FRICTION, 2)
            roi_margin_pct = round((pnl_net / DEFAULT_MARGIN_PER_SLOT) * 100, 2)

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
