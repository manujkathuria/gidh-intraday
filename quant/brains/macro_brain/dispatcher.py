"""
🏛️ GIDH BRAIN 1 (MACRO SELECTOR): IMPLEMENTATION OF BASE BRAIN CONTRACT
"""

import pandas as pd
from quant.brains.base_brain import BaseBrain
from quant.brains.macro_brain.tools.futures_sensor import extract_futures_dynamics
from quant.brains.macro_brain.tools.structure_sensor import extract_structure_dynamics
from quant.brains.macro_brain.tools.review_tool import score_premarket_performance

class MacroSelectorBrain(BaseBrain):
    """
    Brain 1: Pre-Market Institutional Macro Selector.
    """

    def __init__(self):
        super().__init__(brain_id="macro_selector")

    def build_sensory_packet(self, session_date: str, conn=None) -> dict:
        """
        Extracts raw multidimensional sensory state vectors from Tool 1 (Futures) and Tool 2 (Structure).
        Pulls rolling memory context for this brain.
        """
        df_fut = extract_futures_dynamics(session_date, conn=conn)
        df_struct = extract_structure_dynamics(session_date, conn=conn)

        if df_fut.empty or df_struct.empty:
            return {"error": f"No sensory data found for {session_date}"}

        merged = pd.merge(df_struct, df_fut, on="symbol", how="inner", suffixes=('', '_fut'))
        if 'instrument_id_fut' in merged.columns:
            merged.drop(columns=['instrument_id_fut'], inplace=True)

        tradable = merged[(merged['prior_close'] >= 300.0) & (merged['prior_close'] <= 7000.0)].copy()
        rolling_mem = self.get_rolling_memory(conn=conn)

        top_inflows = tradable.sort_values('inflow_1d_cr', ascending=False).head(15)
        top_outflows = tradable.sort_values('inflow_1d_cr', ascending=True).head(15)
        top_compressed = tradable[(tradable['fuel_pct'] >= 50.0) & (tradable['cpr_width_pct'] <= 0.35)].sort_values('inflow_1d_cr', ascending=False).head(10)
        low_fuel_traps = tradable[(tradable['inflow_1d_cr'].abs() >= 30.0) & (tradable['fuel_pct'] < 25.0)].sort_values('inflow_1d_cr', ascending=False).head(10)

        cols = [
            'symbol', 'prior_close', 'fut_price_1d_pct', 'fut_oi_1d_pct',
            'inflow_1d_cr', 'inflow_3d_cr', 'inflow_5d_cr', 'total_notional_cr',
            'cpr_width_pct', 'fuel_pct', 'adr_pct', 'distance_20d_high_pct',
            'distance_20d_low_pct', 'volume_dryup_ratio', 'sma_20', 'sma_50', 'sma_200'
        ]

        return {
            "session_date": session_date,
            "brain_id": self.brain_id,
            "rolling_memory": rolling_mem,
            "top_capital_inflow_candidates": top_inflows[cols].to_dict(orient="records"),
            "top_capital_outflow_candidates": top_outflows[cols].to_dict(orient="records"),
            "top_compressed_coiling_springs": top_compressed[cols].to_dict(orient="records"),
            "low_fuel_exhaustion_candidates": low_fuel_traps[cols].to_dict(orient="records"),
            "full_tradable_dataframe": tradable
        }

    def review_and_record_forensics(
        self,
        session_date: str,
        outcome_date: str,
        ai_forensics_summary: str,
        conn=None
    ) -> dict:
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
            return {"error": f"No decisions found for {session_date}"}

        decisions = row[0]
        picks = []
        for cat in ["focus_bulls", "focus_bears", "exhaustion_traps"]:
            for item in decisions.get(cat, []):
                item['stance'] = cat.upper()
                picks.append(item)
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
