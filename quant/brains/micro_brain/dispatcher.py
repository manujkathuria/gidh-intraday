import json
from typing import Dict, Any, List, Optional
from quant.base.db import get_db_connection
from quant.brains.base_brain import BaseBrain
from quant.brains.micro_brain.types import (
    MicroSensoryPacket, MicroTradeDecisions, MicroOutcomes, CandidateIntradayState
)
from quant.brains.micro_brain.tools.opening_reaction_sensor import extract_opening_reaction
from quant.brains.micro_brain.tools.vwap_pullback_sensor import extract_vwap_pullback_metrics
from quant.brains.micro_brain.tools.orb_structure_sensor import extract_orb_structure_metrics
from quant.brains.micro_brain.tools.fuel_and_oi_sensor import extract_fuel_and_oi_metrics

class MicroBrain(BaseBrain[MicroSensoryPacket, MicroTradeDecisions, MicroOutcomes, Dict[str, Any]]):
    def __init__(self):
        super().__init__(brain_id="micro_brain")

    def build_sensory_packet(self, session_date: str, as_of_time: str = "09:31:00", checkpoint: str = "09:31_EXECUTION", conn=None) -> MicroSensoryPacket:
        close_conn = False
        if conn is None:
            conn = get_db_connection()
            close_conn = True

        try:
            macro_candidates = self._load_macro_candidates(session_date, conn=conn)
            memory = self.get_rolling_memory(conn=conn)

            candidate_states: List[CandidateIntradayState] = []
            for cand in macro_candidates:
                sym = cand["symbol"]
                bias = cand.get("bias", "LONG")
                rank = cand.get("rank", 1)
                thesis = cand.get("thesis", "")

                opening = extract_opening_reaction(sym, session_date, as_of_time=as_of_time, conn=conn)
                vwap = extract_vwap_pullback_metrics(sym, session_date, as_of_time=as_of_time, conn=conn)
                orb = extract_orb_structure_metrics(sym, session_date, as_of_time=as_of_time, macro_bias=bias, conn=conn)
                fuel_oi = extract_fuel_and_oi_metrics(sym, session_date, as_of_time=as_of_time, macro_bias=bias, conn=conn)

                cmp_price = vwap.suggested_pullback_price or opening.session_open

                candidate_states.append(CandidateIntradayState(
                    symbol=sym,
                    macro_bias=bias,
                    macro_rank=rank,
                    macro_thesis=thesis,
                    cmp=cmp_price,
                    opening=opening,
                    vwap=vwap,
                    orb=orb,
                    fuel_oi=fuel_oi
                ))

            return MicroSensoryPacket(
                session_date=session_date,
                as_of_time=as_of_time,
                checkpoint=checkpoint,
                rolling_memory=memory,
                candidates=candidate_states
            )
        finally:
            if close_conn:
                conn.close()

    def _load_macro_candidates(self, session_date: str, conn=None) -> List[Dict[str, Any]]:
        cur = conn.cursor()
        query = """
            SELECT decisions
            FROM quant.brain_sessions
            WHERE brain_id = 'macro_selector' AND session_date = %s
            ORDER BY created_at DESC
            LIMIT 1;
        """
        cur.execute(query, (session_date,))
        row = cur.fetchone()
        if not row or not row[0]:
            return []

        decisions = row[0]
        if isinstance(decisions, str):
            decisions = json.loads(decisions)

        candidates = []
        # Support focus_bulls / focus_bears format
        rank_idx = 1
        for b in decisions.get("focus_bulls", []):
            candidates.append({
                "symbol": b.get("symbol"),
                "bias": "LONG",
                "rank": rank_idx,
                "thesis": b.get("thesis", "")
            })
            rank_idx += 1

        for b in decisions.get("focus_bears", []):
            candidates.append({
                "symbol": b.get("symbol"),
                "bias": "SHORT",
                "rank": rank_idx,
                "thesis": b.get("thesis", "")
            })
            rank_idx += 1

        # Fallback to selections format if focus_bulls/bears not present
        if not candidates:
            for s in decisions.get("selections", []):
                candidates.append({
                    "symbol": s.get("symbol"),
                    "bias": s.get("side", s.get("bias", "LONG")),
                    "rank": s.get("rank", 1),
                    "thesis": s.get("thesis", "")
                })

        return candidates
