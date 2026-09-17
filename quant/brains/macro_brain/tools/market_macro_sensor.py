"""
🏛️ GIDH BRAIN 1 (MACRO SELECTOR): TOOL 0 - MARKET MACRO & SECTOR SENSOR
Extracts raw broad market breadth, universe net capital inflows, and sector rotation dynamics.
"""

from typing import Dict, Any, List
import pandas as pd
from quant.base.db import get_db_connection
from quant.base.sectors import get_sector
from quant.brains.macro_brain.tools.futures_sensor import extract_futures_dynamics
from quant.brains.macro_brain.tools.structure_sensor import extract_structure_dynamics

def extract_market_macro_state(session_date: str, conn=None) -> Dict[str, Any]:
    """
    Extracts high-level Market Breadth and Sector Capital Waves across the 210 universe.
    Contains zero if/else trading rules.
    """
    df_fut = extract_futures_dynamics(session_date, conn=conn)
    df_struct = extract_structure_dynamics(session_date, conn=conn)

    if df_fut.empty or df_struct.empty:
        return {"error": f"No data for {session_date}"}

    merged = pd.merge(df_struct, df_fut, on="symbol", how="inner", suffixes=('', '_fut'))
    if 'instrument_id_fut' in merged.columns:
        merged.drop(columns=['instrument_id_fut'], inplace=True)

    # Attach sector
    merged['sector'] = merged['symbol'].apply(get_sector)

    # 1. Universe-Wide Breadth & Net Institutional Flows
    total_inflow_1d = float(merged['inflow_1d_cr'].sum())
    total_inflow_3d = float(merged['inflow_3d_cr'].sum())
    advances = int((merged['fut_price_1d_pct'] > 0).sum())
    declines = int((merged['fut_price_1d_pct'] < 0).sum())
    neutral = int((merged['fut_price_1d_pct'] == 0).sum())
    pct_above_sma20 = round(float((merged['prior_close'] > merged['sma_20']).mean() * 100.0), 1)
    pct_above_sma50 = round(float((merged['prior_close'] > merged['sma_50']).mean() * 100.0), 1)

    # 2. Sector-by-Sector Capital Waves
    sector_records: List[Dict[str, Any]] = []
    for sector, grp in merged.groupby('sector'):
        sec_inflow_1d = round(float(grp['inflow_1d_cr'].sum()), 1)
        sec_inflow_3d = round(float(grp['inflow_3d_cr'].sum()), 1)
        sec_avg_move = round(float(grp['fut_price_1d_pct'].mean()), 2)
        sec_adv = int((grp['fut_price_1d_pct'] > 0).sum())
        sec_dec = int((grp['fut_price_1d_pct'] < 0).sum())
        sec_count = len(grp)

        top_bull_row = grp.sort_values('inflow_1d_cr', ascending=False).iloc[0]
        top_bear_row = grp.sort_values('inflow_1d_cr', ascending=True).iloc[0]

        sector_records.append({
            "sector": sector,
            "stock_count": sec_count,
            "net_inflow_1d_cr": sec_inflow_1d,
            "net_inflow_3d_cr": sec_inflow_3d,
            "avg_move_1d_pct": sec_avg_move,
            "advances": sec_adv,
            "declines": sec_dec,
            "breadth_pct": round((sec_adv / sec_count) * 100.0, 1),
            "top_bull_symbol": top_bull_row['symbol'],
            "top_bull_inflow_1d_cr": round(float(top_bull_row['inflow_1d_cr']), 1),
            "top_bear_symbol": top_bear_row['symbol'],
            "top_bear_inflow_1d_cr": round(float(top_bear_row['inflow_1d_cr']), 1),
        })

    # Sort sectors by 1D net capital inflow
    sector_records.sort(key=lambda x: x['net_inflow_1d_cr'], reverse=True)

    return {
        "session_date": session_date,
        "universe_net_inflow_1d_cr": round(total_inflow_1d, 1),
        "universe_net_inflow_3d_cr": round(total_inflow_3d, 1),
        "universe_advances": advances,
        "universe_declines": declines,
        "universe_neutral": neutral,
        "pct_above_sma20": pct_above_sma20,
        "pct_above_sma50": pct_above_sma50,
        "sector_capital_waves": sector_records,
        "merged_dataframe": merged
    }
