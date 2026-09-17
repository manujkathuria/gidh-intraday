"""
🏛️ GIDH BRAIN 1 (MACRO SELECTOR): TOOL 3 - REVIEW SENSOR
Extracts raw actual ground-truth intraday execution data (Open, High, Low, Close, Volume) on outcome_date.
Evaluates Gap %, Max Intraday Long Expansion, Max Intraday Drawdown, EOD Net %, and Trap Fades.
"""

import pandas as pd
from quant.base.db import get_db_connection

def extract_actual_outcomes(outcome_date: str, conn=None) -> pd.DataFrame:
    """
    Extracts cash market outcomes for all active stocks on outcome_date.
    """
    should_close = False
    if conn is None:
        conn = get_db_connection()
        should_close = True

    sql = """
    SELECT 
        i.symbol,
        c.open AS t1_open,
        c.high AS t1_high,
        c.low AS t1_low,
        c.close AS t1_close,
        c.volume AS t1_volume
    FROM market.cash_candles_1d c
    JOIN market.instruments i ON c.instrument_id = i.id
    WHERE c.session_date = %s;
    """
    df = pd.read_sql(sql, conn, params=[outcome_date])
    if should_close:
        conn.close()
    return df

def score_premarket_performance(picks_df: pd.DataFrame, outcome_date: str, conn=None) -> dict:
    """
    Cross-references Brain 1's pre-market selection against actual outcome metrics.
    """
    if picks_df.empty:
        return {"error": "No pre-market picks provided for review."}

    df_outcome = extract_actual_outcomes(outcome_date, conn=conn)
    if df_outcome.empty:
        return {"error": f"No ground-truth outcome data found for {outcome_date}"}

    merged = pd.merge(picks_df, df_outcome, on="symbol", how="inner")
    if merged.empty:
        return {"error": "No symbol overlap found between picks and outcome data."}

    # Calculate performance metrics
    merged['gap_pct'] = ((merged['t1_open'] - merged['prior_close']) / merged['prior_close']) * 100.0
    merged['eod_net_pct'] = ((merged['t1_close'] - merged['prior_close']) / merged['prior_close']) * 100.0
    merged['intraday_max_long_pct'] = ((merged['t1_high'] - merged['t1_open']) / merged['t1_open']) * 100.0
    merged['intraday_max_short_pct'] = ((merged['t1_low'] - merged['t1_open']) / merged['t1_open']) * 100.0
    merged['intraday_fade_pct'] = merged['eod_net_pct'] - merged['gap_pct']

    # Performance Summaries
    longs = merged[merged['stance'].str.contains('BULL|LONG', case=False, na=False)]
    shorts = merged[merged['stance'].str.contains('BEAR|SHORT', case=False, na=False)]
    traps = merged[merged['stance'].str.contains('EXHAUSTION|TRAP', case=False, na=False)]

    long_stats = {}
    if not longs.empty:
        long_stats = {
            "count": len(longs),
            "win_rate_pct": round((len(longs[longs['eod_net_pct'] > 0]) / len(longs)) * 100.0, 1),
            "avg_eod_net_pct": round(longs['eod_net_pct'].mean(), 2),
            "avg_intraday_expansion_pct": round(longs['intraday_max_long_pct'].mean(), 2),
            "avg_intraday_drawdown_pct": round(longs['intraday_max_short_pct'].mean(), 2),
            "top_bull": longs.sort_values('eod_net_pct', ascending=False).iloc[0]['symbol'],
            "top_bull_return_pct": round(longs.sort_values('eod_net_pct', ascending=False).iloc[0]['eod_net_pct'], 2)
        }

    short_stats = {}
    if not shorts.empty:
        short_stats = {
            "count": len(shorts),
            "win_rate_pct": round((len(shorts[shorts['eod_net_pct'] < 0]) / len(shorts)) * 100.0, 1),
            "avg_eod_net_pct": round(shorts['eod_net_pct'].mean(), 2),
            "avg_intraday_drop_pct": round(shorts['intraday_max_short_pct'].mean(), 2),
            "top_bear": shorts.sort_values('eod_net_pct', ascending=True).iloc[0]['symbol'],
            "top_bear_return_pct": round(shorts.sort_values('eod_net_pct', ascending=True).iloc[0]['eod_net_pct'], 2)
        }

    trap_stats = {}
    if not traps.empty:
        faded = traps[traps['intraday_fade_pct'] <= 0.0]
        trap_stats = {
            "count": len(traps),
            "faded_count": len(faded),
            "trap_avoidance_accuracy_pct": round((len(faded) / len(traps)) * 100.0, 1),
            "avg_intraday_fade_pct": round(traps['intraday_fade_pct'].mean(), 2)
        }

    return {
        "outcome_date": outcome_date,
        "merged_df": merged,
        "long_stats": long_stats,
        "short_stats": short_stats,
        "trap_stats": trap_stats
    }
