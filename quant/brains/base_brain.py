"""
🏛️ GIDH QUANT: BASE BRAIN CONTRACT & PROTOCOL
Every brain (Macro Selector, Micro VWAP, Micro ORB, Risk Governor) MUST adhere to this contract.
"""

from abc import ABC, abstractmethod
from dataclasses import is_dataclass, asdict
from typing import Generic, TypeVar, Union, Dict, Any, Optional
import json
import math
from quant.base.db import get_db_connection

TSensory = TypeVar("TSensory")
TDecision = TypeVar("TDecision")
TOutcome = TypeVar("TOutcome")
TMemory = TypeVar("TMemory")

def sanitize_for_json(data: Any) -> Any:
    """Recursively replaces dataclasses, NaN, Infinity, and numpy types with clean Python primitives."""
    if is_dataclass(data) and not isinstance(data, type):
        data = asdict(data)

    if isinstance(data, dict):
        return {k: sanitize_for_json(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_for_json(v) for v in data]
    elif isinstance(data, float):
        if math.isnan(data) or math.isinf(data):
            return None
        return data
    return data

class BaseBrain(Generic[TSensory, TDecision, TOutcome, TMemory], ABC):
    """
    Abstract Base Brain Contract with generic typing.
    Enforces a strict 3-stage cognitive protocol across every trading brain:
      1. `build_sensory_packet(session_date)` -> Ingests raw tools without if/else logic
      2. `record_decision(session_date, decisions, thesis)` -> Persists JSON payload to quant.brain_sessions
      3. `record_eod_forensics(session_date, outcome_date, forensics)` -> Reviews outcome & updates rolling memory
    """

    def __init__(self, brain_id: str):
        self.brain_id = brain_id

    @abstractmethod
    def build_sensory_packet(self, session_date: str, conn=None) -> TSensory:
        """
        Gathers raw multidimensional sensory measurements from this brain's dedicated tools.
        Must return pure unadulterated sensory structure for AI reasoning.
        """
        pass

    def record_decision(
        self,
        session_date: str,
        decisions: Union[TDecision, dict],
        sensory_features: Union[TSensory, dict],
        ai_thesis: str,
        conn=None
    ) -> Union[TDecision, dict]:
        """
        Universal persistence for pre-session / intraday AI decisions.
        Saves into `quant.brain_sessions`. Accepts typed dataclass or dict.
        """
        should_close = False
        if conn is None:
            conn = get_db_connection()
            should_close = True

        clean_decisions = sanitize_for_json(decisions)
        clean_features = sanitize_for_json(sensory_features)

        cur = conn.cursor()
        sql = """
        INSERT INTO quant.brain_sessions (
            session_date, brain_id, decisions, sensory_features, ai_thesis, created_at
        ) VALUES (%s, %s, %s, %s, %s, NOW())
        ON CONFLICT (session_date, brain_id) DO UPDATE SET
            decisions = EXCLUDED.decisions,
            sensory_features = EXCLUDED.sensory_features,
            ai_thesis = EXCLUDED.ai_thesis,
            created_at = NOW();
        """
        cur.execute(sql, (
            session_date,
            self.brain_id,
            json.dumps(clean_decisions, default=str),
            json.dumps(clean_features, default=str),
            ai_thesis
        ))

        conn.commit()
        if should_close:
            conn.close()

        return decisions

    def record_eod_forensics(
        self,
        session_date: str,
        outcomes_payload: Union[TOutcome, dict],
        forensics_summary: str,
        conn=None
    ) -> Union[TOutcome, dict]:
        """
        Universal persistence for post-session EOD execution review and forensic learnings.
        Updates `quant.brain_sessions` and syncs rolling `quant.brain_memory`.
        """
        should_close = False
        if conn is None:
            conn = get_db_connection()
            should_close = True

        clean_outcomes = sanitize_for_json(outcomes_payload)

        cur = conn.cursor()
        sql = """
        UPDATE quant.brain_sessions SET
            outcomes = %s,
            forensics = %s,
            reviewed_at = NOW()
        WHERE session_date = %s AND brain_id = %s;
        """
        cur.execute(sql, (
            json.dumps(clean_outcomes, default=str),
            forensics_summary,
            session_date,
            self.brain_id
        ))

        # Update rolling brain memory buffer
        self._update_rolling_memory({
            "last_session_date": session_date,
            "last_forensics": forensics_summary,
            "recent_outcomes": clean_outcomes
        }, cur=cur)

        conn.commit()
        if should_close:
            conn.close()

        return outcomes_payload

    def get_rolling_memory(self, conn=None) -> dict:
        """
        Pulls this brain's persistent multi-day cognitive memory from `quant.brain_memory`.
        """
        should_close = False
        if conn is None:
            conn = get_db_connection()
            should_close = True

        cur = conn.cursor()
        cur.execute("SELECT memory_state FROM quant.brain_memory WHERE brain_id = %s;", (self.brain_id,))
        row = cur.fetchone()
        if should_close:
            conn.close()

        return row[0] if row else {}

    def _update_rolling_memory(self, patch: dict, cur=None):
        """Internal helper to merge and persist rolling memory"""
        cur.execute("SELECT memory_state FROM quant.brain_memory WHERE brain_id = %s;", (self.brain_id,))
        row = cur.fetchone()
        current_mem = row[0] if row else {}
        current_mem.update(patch)

        clean_mem = sanitize_for_json(current_mem)
        sql = """
        INSERT INTO quant.brain_memory (brain_id, memory_state, updated_at)
        VALUES (%s, %s, NOW())
        ON CONFLICT (brain_id) DO UPDATE SET
            memory_state = EXCLUDED.memory_state,
            updated_at = NOW();
        """
        cur.execute(sql, (self.brain_id, json.dumps(clean_mem, default=str)))
