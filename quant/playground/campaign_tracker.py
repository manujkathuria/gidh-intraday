import pandas as pd
import numpy as np
from quant.db import get_db_connection

def get_campaign_status(session_date, conn=None):
    """
    Analyzes the entire F&O universe for a given session date and identifies:
    1. DAY_1_INCEPTION: Fresh institutional campaign launch (Price move + Futures OI surge + High Volume + Clean Close).
    2. ACTIVE_CAMPAIGN: Ongoing markup/markdown (Day 2 to 5 continuation).
    3. EXHAUSTED_CHOP: Overextended or choppy regimes.
    """
    if conn is None:
        conn = get_db_connection()

    sql = """
    WITH fut_daily AS (
        SELECT 
            fc.instrument_id,
            fc.trading_symbol,
            f1d.session_date,
            f1d.close AS fut_close,
            f1d.open_interest AS fut_oi,
            LAG(f1d.close, 1) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS prev_fut_close,
            LAG(f1d.open_interest, 1) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS prev_fut_oi,
            LAG(f1d.open_interest, 5) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS fut_oi_5d_ago
        FROM market.future_candles_1d f1d
        JOIN market.future_contracts fc ON f1d.future_contract_id = fc.id
        WHERE f1d.session_date <= %s
    ),
    latest_fut AS (
        SELECT DISTINCT ON (instrument_id)
            instrument_id,
            trading_symbol,
            fut_close,
            fut_oi,
            ROUND(((fut_close - prev_fut_close) / NULLIF(prev_fut_close, 0) * 100)::numeric, 2) AS fut_price_chg_pct,
            ROUND(((fut_oi - prev_fut_oi)::numeric / NULLIF(prev_fut_oi, 0) * 100)::numeric, 2) AS fut_oi_1d_chg_pct,
            ROUND(((fut_oi - fut_oi_5d_ago)::numeric / NULLIF(fut_oi_5d_ago, 0) * 100)::numeric, 2) AS fut_oi_5d_chg_pct
        FROM fut_daily
        ORDER BY instrument_id, fut_close DESC
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
            WHERE session_date <= %s
        ) sub
        WHERE rn <= 200
        GROUP BY instrument_id
        HAVING COUNT(*) >= 50
    )
    SELECT 
        i.id AS instrument_id,
        i.symbol,
        df.prior_close,
        df.prior_high,
        df.prior_low,
        df.cpr_pivot,
        ROUND((ABS(df.cpr_tc - df.cpr_bc) / df.cpr_pivot * 100)::numeric, 3) AS cpr_width_pct,
        ROUND((df.adr_20 / df.prior_close * 100)::numeric, 2) AS adr_pct,
        df.sma_20,
        df.sma_50,
        ROUND(s200.sma_200::numeric, 2) AS sma_200,
        df.return_5d_pct,
        df.return_20d_pct,
        df.distance_20d_high_pct,
        df.distance_20d_low_pct,
        df.average_daily_volume_20,
        lf.fut_price_chg_pct,
        lf.fut_oi_1d_chg_pct,
        lf.fut_oi_5d_chg_pct
    FROM market.daily_features df
    JOIN market.instruments i ON df.instrument_id = i.id
    JOIN market.feature_runs fr ON df.feature_run_id = fr.id
    LEFT JOIN sma_data s200 ON df.instrument_id = s200.instrument_id
    LEFT JOIN latest_fut lf ON df.instrument_id = lf.instrument_id
    WHERE fr.session_date = %s
      AND fr.status = 'SUCCEEDED'
      AND i.is_active = TRUE
      AND df.prior_close BETWEEN 300 AND 5000
      AND df.average_daily_volume_20 >= 500000;
    """

    df = pd.read_sql(sql, conn, params=(session_date, session_date, session_date))
    if df.empty:
        return df

    # Campaign Tagging Logic
    def classify_campaign(row):
        is_bull_stack = row['prior_close'] > row['sma_20'] >= row['sma_50'] and (row['sma_200'] is None or row['prior_close'] > row['sma_200'])
        is_bear_stack = row['prior_close'] < row['sma_20'] <= row['sma_50'] and (row['sma_200'] is None or row['prior_close'] < row['sma_200'])
        
        oi_surge = row['fut_oi_1d_chg_pct'] if pd.notnull(row['fut_oi_1d_chg_pct']) else 0.0
        p_chg = row['fut_price_chg_pct'] if pd.notnull(row['fut_price_chg_pct']) else 0.0
        
        # Day 1 Bullish Launch: Price up + Futures OI surged > +5% + Near 20D high + Bull stack
        if is_bull_stack and p_chg > 1.0 and oi_surge >= 5.0 and row['distance_20d_high_pct'] <= 3.5:
            return "DAY_1_BULL_LAUNCH"
        # Day 1 Bearish Launch: Price down + Futures OI surged > +5% + Near 20D low + Bear stack
        elif is_bear_stack and p_chg < -1.0 and oi_surge >= 5.0 and row['distance_20d_low_pct'] <= 3.5:
            return "DAY_1_BEAR_LAUNCH"
        # Active Bull Campaign (Days 2 to 5 Continuation)
        elif is_bull_stack and row['return_5d_pct'] > 2.0 and row['distance_20d_high_pct'] <= 4.5:
            return "ACTIVE_BULL_CAMPAIGN"
        # Active Bear Campaign (Days 2 to 5 Continuation)
        elif is_bear_stack and row['return_5d_pct'] < -2.0 and row['distance_20d_low_pct'] <= 4.5:
            return "ACTIVE_BEAR_CAMPAIGN"
        # Coiling Setup (Tight CPR near breakout)
        elif is_bull_stack and row['cpr_width_pct'] <= 0.30 and row['distance_20d_high_pct'] <= 4.0:
            return "BULL_SPRING_COILING"
        elif is_bear_stack and row['cpr_width_pct'] <= 0.30 and row['distance_20d_low_pct'] <= 4.0:
            return "BEAR_SPRING_COILING"
        else:
            return "CHOP_RANGE"

    df['campaign_stage'] = df.apply(classify_campaign, axis=1)
    return df
