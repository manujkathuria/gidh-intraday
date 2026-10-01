import sys
import os
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import psycopg2
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple
from quant.config import settings

def get_db_connection():
    return psycopg2.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        dbname=settings.DB_NAME
    )

def get_all_symbols() -> List[str]:
    """Fetch all 213 active F&O equity symbols sorted alphabetically."""
    conn = get_db_connection()
    try:
        query = "SELECT symbol FROM market.instruments WHERE is_active = true ORDER BY symbol ASC;"
        df = pd.read_sql(query, conn)
        return df['symbol'].tolist()
    finally:
        conn.close()

def get_all_dates() -> List[str]:
    """Fetch all distinct session dates in descending order."""
    conn = get_db_connection()
    try:
        query = """
        SELECT DISTINCT session_date 
        FROM market.cash_candles_1d 
        ORDER BY session_date DESC;
        """
        df = pd.read_sql(query, conn)
        return [d.strftime('%Y-%m-%d') for d in df['session_date']]
    finally:
        conn.close()

def get_macro_daily_candles(symbol: str, end_date: str, limit: int = 120) -> pd.DataFrame:
    """Fetch daily candles for a stock up to end_date (inclusive) with dynamic 5-day PWH, PWL, CLV, and Swings."""
    conn = get_db_connection()
    try:
        query = """
        SELECT 
            c.session_date as date, 
            c.open, 
            c.high, 
            c.low, 
            c.close, 
            c.volume
        FROM market.cash_candles_1d c
        JOIN market.instruments i ON i.id = c.instrument_id
        WHERE i.symbol = %s AND c.session_date <= %s
        ORDER BY c.session_date DESC
        LIMIT %s;
        """
        df = pd.read_sql(query, conn, params=(symbol, end_date, limit + 10))
        if df.empty:
            return df
        
        df = df.sort_values(by='date').reset_index(drop=True)
        for col in ['open', 'high', 'low', 'close', 'volume']:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Calculate Prior Week High and Low
        df['pwh'] = df['high'].shift(1).rolling(window=5).max()
        df['pwl'] = df['low'].shift(1).rolling(window=5).min()
        
        # Calculate Close Location Value (CLV)
        hl_range = (df['high'] - df['low']).replace(0, 1e-5)
        df['clv'] = (((df['close'] - df['low']) - (df['high'] - df['close'])) / hl_range).round(2)
        
        # Calculate Structural Swing Highs & Lows (Order = 3)
        df['swing_high'] = None
        df['swing_low'] = None
        df['swing_label'] = ''
        
        highs = []
        lows = []
        order = 3
        for i in range(order, len(df) - order):
            is_high = all(df.loc[i, 'high'] > df.loc[i-k, 'high'] for k in range(1, order+1)) and \
                      all(df.loc[i, 'high'] >= df.loc[i+k, 'high'] for k in range(1, min(order+1, len(df)-i)))
            is_low = all(df.loc[i, 'low'] < df.loc[i-k, 'low'] for k in range(1, order+1)) and \
                     all(df.loc[i, 'low'] <= df.loc[i+k, 'low'] for k in range(1, min(order+1, len(df)-i)))
            
            if is_high:
                df.loc[i, 'swing_high'] = df.loc[i, 'high']
                label = 'HH' if not highs or df.loc[i, 'high'] > highs[-1] else 'LH'
                highs.append(df.loc[i, 'high'])
                df.loc[i, 'swing_label'] = label
            elif is_low:
                df.loc[i, 'swing_low'] = df.loc[i, 'low']
                label = 'LL' if not lows or df.loc[i, 'low'] < lows[-1] else 'HL'
                lows.append(df.loc[i, 'low'])
                df.loc[i, 'swing_label'] = label
        
        df = df.tail(limit).reset_index(drop=True)
        return df
    finally:
        conn.close()

def get_intraday_data_with_macro_levels(symbol: str, target_date: str) -> Tuple[pd.DataFrame, Dict[str, any]]:
    """
    Fetches 1-minute candles for target_date and computes ONLY TRULY VALID (unviolated) levels:
    1. Last 2 Valid CLV Rejection Ceilings (High of days with CLV <= -0.60 that price has not closed above)
    2. Last 2 Valid CLV Defence Floors (Low of days with CLV >= +0.60 that price has not closed below)
    3. Nearest Valid Unviolated Swing Resistance (LH/HH)
    4. Nearest Valid Unviolated Swing Support (HL/LL)
    5. PWH and PWL (Prior 5-day bounds)
    """
    conn = get_db_connection()
    try:
        # 1. 1-minute candles for the target day
        query_1m = """
        SELECT (c.ts AT TIME ZONE 'Asia/Kolkata') as ts_ist, c.open, c.high, c.low, c.close, c.volume
        FROM market.cash_candles_1m c
        JOIN market.instruments i ON i.id = c.instrument_id
        WHERE i.symbol = %s AND (c.ts AT TIME ZONE 'Asia/Kolkata')::date = %s
        ORDER BY c.ts ASC;
        """
        df_1m = pd.read_sql(query_1m, conn, params=(symbol, target_date))
        
        # 2. Prior daily candles up to T-1 (look back 90 sessions)
        query_1d = """
        SELECT c.session_date as date, c.open, c.high, c.low, c.close, c.volume
        FROM market.cash_candles_1d c
        JOIN market.instruments i ON i.id = c.instrument_id
        WHERE i.symbol = %s AND c.session_date < %s
        ORDER BY c.session_date DESC
        LIMIT 90;
        """
        df_1d = pd.read_sql(query_1d, conn, params=(symbol, target_date)).sort_values('date').reset_index(drop=True)
        
        if df_1d.empty:
            return pd.DataFrame(), {}
            
        for col in ['open', 'high', 'low', 'close', 'volume']:
            df_1d[col] = pd.to_numeric(df_1d[col], errors='coerce')
            
        # PWH / PWL (prior 5 trading sessions) and PDH / PDL (prior 1 trading session)
        pwh = float(df_1d['high'].iloc[-5:].max())
        pwl = float(df_1d['low'].iloc[-5:].min())
        pdh = float(df_1d['high'].iloc[-1])
        pdl = float(df_1d['low'].iloc[-1])
        latest_close = float(df_1d['close'].iloc[-1])
        
        # Calculate CLV on prior days
        hl_range = (df_1d['high'] - df_1d['low']).replace(0, 1e-5)
        df_1d['clv'] = (((df_1d['close'] - df_1d['low']) - (df_1d['high'] - df_1d['close'])) / hl_range).round(2)
        
        # -------------------------------------------------------------
        # FIND LAST 2 VALID (UNVIOLATED) CLV REJECTION SUPPLY ZONES
        # -------------------------------------------------------------
        valid_clv_supply_zones = []
        for i in range(len(df_1d) - 1, -1, -1):
            if df_1d.loc[i, 'clv'] <= -0.60:
                top = float(df_1d.loc[i, 'high'])
                candle_low = float(df_1d.loc[i, 'low'])
                body_top = float(max(df_1d.loc[i, 'open'], df_1d.loc[i, 'close']))
                # If upper wick is very small or zero, zone is top 25% of the candle range
                bottom = body_top if (top - body_top) >= 0.15 * (top - candle_low) else (top - 0.25 * (top - candle_low))
                subsequent_closes = df_1d.loc[i+1:, 'close']
                # Valid only if price has NEVER closed above this rejection high
                if subsequent_closes.empty or (subsequent_closes < top).all():
                    valid_clv_supply_zones.append({
                        'top': round(top, 2),
                        'bottom': round(bottom, 2),
                        'date': str(df_1d.loc[i, 'date'])
                    })
                    if len(valid_clv_supply_zones) == 2:
                        break

        # -------------------------------------------------------------
        # FIND LAST 2 VALID (UNVIOLATED) CLV DEFENCE DEMAND ZONES
        # -------------------------------------------------------------
        valid_clv_demand_zones = []
        for i in range(len(df_1d) - 1, -1, -1):
            if df_1d.loc[i, 'clv'] >= 0.60:
                bottom = float(df_1d.loc[i, 'low'])
                candle_high = float(df_1d.loc[i, 'high'])
                body_bottom = float(min(df_1d.loc[i, 'open'], df_1d.loc[i, 'close']))
                # If lower wick is very small or zero, zone is bottom 25% of the candle range
                top = body_bottom if (body_bottom - bottom) >= 0.15 * (candle_high - bottom) else (bottom + 0.25 * (candle_high - bottom))
                subsequent_closes = df_1d.loc[i+1:, 'close']
                # Valid only if price has NEVER closed below this defence low
                if subsequent_closes.empty or (subsequent_closes > bottom).all():
                    valid_clv_demand_zones.append({
                        'top': round(top, 2),
                        'bottom': round(bottom, 2),
                        'date': str(df_1d.loc[i, 'date'])
                    })
                    if len(valid_clv_demand_zones) == 2:
                        break

        # -------------------------------------------------------------
        # FIND NEAREST VALID UNVIOLATED SWING RESISTANCE & SUPPORT
        # -------------------------------------------------------------
        order = 3
        df_1d['swing_high'] = None
        df_1d['swing_low'] = None
        for i in range(order, len(df_1d) - order):
            is_high = all(df_1d.loc[i, 'high'] > df_1d.loc[i-k, 'high'] for k in range(1, order+1)) and \
                      all(df_1d.loc[i, 'high'] >= df_1d.loc[i+k, 'high'] for k in range(1, min(order+1, len(df_1d)-i)))
            is_low = all(df_1d.loc[i, 'low'] < df_1d.loc[i-k, 'low'] for k in range(1, order+1)) and \
                     all(df_1d.loc[i, 'low'] <= df_1d.loc[i+k, 'low'] for k in range(1, min(order+1, len(df_1d)-i)))
            if is_high:
                df_1d.loc[i, 'swing_high'] = float(df_1d.loc[i, 'high'])
            if is_low:
                df_1d.loc[i, 'swing_low'] = float(df_1d.loc[i, 'low'])

        valid_swing_res = None
        for i in range(len(df_1d) - 1, -1, -1):
            if df_1d.loc[i, 'swing_high'] is not None:
                lvl = float(df_1d.loc[i, 'swing_high'])
                subsequent_closes = df_1d.loc[i+1:, 'close']
                if subsequent_closes.empty or (subsequent_closes < lvl).all():
                    valid_swing_res = lvl
                    break

        valid_swing_sup = None
        for i in range(len(df_1d) - 1, -1, -1):
            if df_1d.loc[i, 'swing_low'] is not None:
                lvl = float(df_1d.loc[i, 'swing_low'])
                subsequent_closes = df_1d.loc[i+1:, 'close']
                if subsequent_closes.empty or (subsequent_closes > lvl).all():
                    valid_swing_sup = lvl
                    break

        macro_levels = {
            'pwh': pwh,
            'pwl': pwl,
            'pdh': pdh,
            'pdl': pdl,
            'swing_res': valid_swing_res,
            'swing_sup': valid_swing_sup,
            'clv_supply_zones': valid_clv_supply_zones,
            'clv_demand_zones': valid_clv_demand_zones,
            'clv_rej_1': valid_clv_supply_zones[0]['top'] if len(valid_clv_supply_zones) > 0 else None,
            'clv_rej_2': valid_clv_supply_zones[1]['top'] if len(valid_clv_supply_zones) > 1 else None,
            'clv_def_1': valid_clv_demand_zones[0]['bottom'] if len(valid_clv_demand_zones) > 0 else None,
            'clv_def_2': valid_clv_demand_zones[1]['bottom'] if len(valid_clv_demand_zones) > 1 else None
        }

        if not df_1m.empty:
            for col in ['open', 'high', 'low', 'close', 'volume']:
                df_1m[col] = pd.to_numeric(df_1m[col], errors='coerce')
            df_1m['time_str'] = pd.to_datetime(df_1m['ts_ist']).dt.strftime('%H:%M')
            df_1m['tp'] = (df_1m['high'] + df_1m['low'] + df_1m['close']) / 3.0
            df_1m['cum_tp_vol'] = (df_1m['tp'] * df_1m['volume']).cumsum()
            df_1m['cum_vol'] = df_1m['volume'].cumsum()
            df_1m['vwap'] = (df_1m['cum_tp_vol'] / df_1m['cum_vol'].replace(0, 1)).round(2)

        return df_1m, macro_levels
    finally:
        conn.close()
