import pandas as pd
from quant.base.db import get_db_connection, DEFAULT_TRADE_CAPITAL

def run_premarket_scan(session_date: str, conn=None):
    """
    Runs the 5-Gate Macro Regime Funnel to generate Grade-A Long & Short Watchlists.
    """
    if conn is None:
        conn = get_db_connection()
        
    cur = conn.cursor()
    cur.execute("SELECT id FROM market.feature_runs WHERE session_date = %s AND status = 'SUCCEEDED'", (session_date,))
    row = cur.fetchone()
    if not row:
        print(f"[ERROR] No successful feature run found for {session_date}")
        return None, None, None
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

    sweet_spot = (
        df_pre['prior_close'].between(300, 5000) &
        (df_pre['average_daily_volume_20'] >= 500000) &
        (df_pre['adr_pct'] >= 1.85)
    )

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
        longs['suggested_qty'] = (DEFAULT_TRADE_CAPITAL / longs['prior_close']).astype(int)

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
        shorts['suggested_qty'] = (DEFAULT_TRADE_CAPITAL / shorts['prior_close']).astype(int)

    return longs, shorts, feature_run_id
