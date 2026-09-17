"""
🏛️ GIDH BRAIN 1 (MACRO SELECTOR): IMPLEMENTATION OF BASE BRAIN CONTRACT
Type-safe dispatcher connecting Tools 0, 1, 2, and 3 to PostgreSQL universal JSONB schema.
"""

from typing import Union, Dict, Any, List
import pandas as pd
from quant.brains.base_brain import BaseBrain
from quant.brains.macro_brain.types import (
    MacroSensoryPacket,
    MacroDecisions,
    MacroOutcomes,
    MacroMemoryState,
)
from quant.brains.macro_brain.tools.market_macro_sensor import extract_market_macro_state
from quant.brains.macro_brain.tools.review_tool import score_premarket_performance

class MacroSelectorBrain(BaseBrain[MacroSensoryPacket, MacroDecisions, MacroOutcomes, MacroMemoryState]):
    """
    Brain 1: Pre-Market Institutional Macro Selector & Sector Rotation Engine.
    """

    def __init__(self):
        super().__init__(brain_id="macro_selector")

    def build_sensory_packet(self, session_date: str, conn=None) -> MacroSensoryPacket:
        """
        Extracts raw multidimensional sensory state vectors from Market Breadth, Sector Waves, and Structure.
        Pulls rolling memory context for this brain.
        """
        macro_state = extract_market_macro_state(session_date, conn=conn)
        if "error" in macro_state:
            raise ValueError(macro_state["error"])

        merged = macro_state["merged_dataframe"]
        tradable = merged[(merged['prior_close'] >= 300.0) & (merged['prior_close'] <= 7000.0)].copy()
        rolling_mem = self.get_rolling_memory(conn=conn)

        # Active Movers Only (|inflow| >= 15 Cr, top 10 cohorts)
        top_inflows = tradable[tradable['inflow_1d_cr'] >= 15.0].sort_values('inflow_1d_cr', ascending=False).head(10)
        top_outflows = tradable[tradable['inflow_1d_cr'] <= -15.0].sort_values('inflow_1d_cr', ascending=True).head(10)
        top_compressed = tradable[(tradable['fuel_pct'] >= 35.0) & (tradable['cpr_width_pct'] <= 0.35) & (tradable['inflow_1d_cr'].abs() >= 10.0)].sort_values('inflow_1d_cr', ascending=False).head(6)
        low_fuel_traps = tradable[(tradable['inflow_1d_cr'].abs() >= 25.0) & (tradable['fuel_pct'] < 20.0)].sort_values('inflow_1d_cr', ascending=False).head(6)

        cols = [
            'symbol', 'sector', 'prior_close', 'fut_price_1d_pct', 'fut_oi_1d_pct',
            'inflow_1d_cr', 'inflow_3d_cr', 'cpr_width_pct', 'fuel_pct', 'distance_20d_high_pct',
            'distance_20d_low_pct'
        ]

        return MacroSensoryPacket(
            session_date=session_date,
            brain_id=self.brain_id,
            rolling_memory=rolling_mem,
            universe_net_inflow_1d_cr=macro_state["universe_net_inflow_1d_cr"],
            universe_net_inflow_3d_cr=macro_state["universe_net_inflow_3d_cr"],
            universe_advances=macro_state["universe_advances"],
            universe_declines=macro_state["universe_declines"],
            pct_above_sma20=macro_state["pct_above_sma20"],
            pct_above_sma50=macro_state["pct_above_sma50"],
            sector_capital_waves=macro_state["sector_capital_waves"],
            top_capital_inflow_candidates=top_inflows[cols].to_dict(orient="records"),
            top_capital_outflow_candidates=top_outflows[cols].to_dict(orient="records"),
            top_compressed_coiling_springs=top_compressed[cols].to_dict(orient="records"),
            low_fuel_exhaustion_candidates=low_fuel_traps[cols].to_dict(orient="records"),
            full_tradable_dataframe=tradable
        )

    def review_and_record_forensics(
        self,
        session_date: str,
        outcome_date: str,
        ai_forensics_summary: str,
        conn=None
    ) -> Dict[str, Any]:
        """
        Runs Tool 3 (Review Tool) and persists forensics via BaseBrain contract.
        """
        should_close = False
        if conn is None:
            from quant.base.db import get_db_connection
            conn = get_db_connection()
            should_close = True

        cur = conn.cursor()
        cur.execute("SELECT decisions FROM quant.brain_sessions WHERE session_date = %s AND brain_id = %s;", (session_date, self.brain_id))
        row = cur.fetchone()
        if not row:
            if should_close:
                conn.close()
            raise ValueError(f"No decisions found for {session_date}")

        decisions = row[0]
        picks = []
        for cat in ["focus_bulls", "focus_bears", "exhaustion_traps"]:
            for item in decisions.get(cat, []):
                item_copy = dict(item)
                item_copy['stance'] = cat.upper()
                picks.append(item_copy)
        picks_df = pd.DataFrame(picks)

        review_metrics = score_premarket_performance(picks_df, outcome_date, conn=conn)

        self.record_eod_forensics(
            session_date=session_date,
            outcomes_payload=review_metrics,
            forensics_summary=ai_forensics_summary,
            conn=conn
        )

        if should_close:
            conn.close()

        review_metrics["ai_forensics_summary"] = ai_forensics_summary
        return review_metrics
