"""
🏛️ GIDH QUANT: BASE BRAIN CONTRACT & PROTOCOL
Every brain (Macro Selector, Micro VWAP, Micro ORB, Risk Governor) MUST adhere to this contract.
"""

from abc import ABC, abstractmethod
import json
from quant.base.db import get_db_connection

class BaseBrain(ABC):
    """
    Abstract Base Brain Contract.
    Enforces a strict 3-stage cognitive protocol across every trading brain:
      1. `build_sensory_packet(session_date)` -> Ingests raw tools without if/else logic
      2. `record_decision(session_date, decisions, thesis)` -> Persists JSON payload to quant.brain_sessions
      3. `record_eod_forensics(session_date, outcome_date, forensics)` -> Reviews outcome & updates rolling memory
    """

    def __init__(self, brain_id: str):
        self.brain_id = brain_id

    @abstractmethod
    def build_sensory_packet(self, session_date: str, conn=None) -> dict:
        """
        Gathers raw multidimensional sensory measurements from this brain's dedicated tools.
        Must return pure unadulterated dictionary for AI reasoning.
        """
        pass

    def record_decision(
        self,
        session_date: str,
        decisions: dict,
        sensory_features: dict,
        ai_thesis: str,
        conn=None
    ) -> dict:
        """
        Universal persistence for pre-session / intraday AI decisions.
        Saves into `quant.brain_sessions`.
        """
        should_close = False
        if conn is None:
            conn = get_db_connection()
            should_close = True

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
            json.dumps(decisions, default=str),
            json.dumps(sensory_features, default=str),
            ai_thesis
        ))

        conn.commit()
        if should_close:
            conn.close()

        return decisions

    def record_eod_forensics(
        self,
        session_date: str,
        outcomes_payload: dict,
        forensics_summary: str,
        conn=None
    ) -> dict:
        """
        Universal persistence for post-session EOD execution review and forensic learnings.
        Updates `quant.brain_sessions` and syncs rolling `quant.brain_memory`.
        """
        should_close = False
        if conn is None:
            conn = get_db_connection()
            should_close = True

        cur = conn.cursor()
        sql = """
        UPDATE quant.brain_sessions SET
            outcomes = %s,
            forensics = %s,
            reviewed_at = NOW()
        WHERE session_date = %s AND brain_id = %s;
        """
        cur.execute(sql, (
            json.dumps(outcomes_payload, default=str),
            forensics_summary,
            session_date,
            self.brain_id
        ))

        # Update rolling brain memory buffer
        self._update_rolling_memory({
            "last_session_date": session_date,
            "last_forensics": forensics_summary,
            "recent_outcomes": outcomes_payload
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

        sql = """
        INSERT INTO quant.brain_memory (brain_id, memory_state, updated_at)
        VALUES (%s, %s, NOW())
        ON CONFLICT (brain_id) DO UPDATE SET
            memory_state = EXCLUDED.memory_state,
            updated_at = NOW();
        """
        cur.execute(sql, (self.brain_id, json.dumps(current_mem, default=str)))
