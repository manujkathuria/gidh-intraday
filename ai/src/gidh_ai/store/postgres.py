from __future__ import annotations

import os
from dataclasses import asdict
from datetime import date
from urllib.parse import quote

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from gidh_ai.research.focus import FocusCandidate


class PostgresStore:
    def __init__(self, database_url: str) -> None:
        self._database_url = database_url

    @classmethod
    def from_environment(cls) -> "PostgresStore":
        url = os.getenv("GIDH_DATABASE_URL")
        if url:
            return cls(url)
        required = ("DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME", "DB_SSLMODE")
        missing = [key for key in required if not os.getenv(key)]
        if missing:
            raise RuntimeError(f"missing database settings: {', '.join(missing)}")
        return cls("postgres://{user}:{password}@{host}:{port}/{name}?sslmode={sslmode}".format(
            user=os.environ["DB_USER"], password=quote(os.environ["DB_PASSWORD"], safe=""), host=os.environ["DB_HOST"],
            port=os.environ["DB_PORT"], name=os.environ["DB_NAME"], sslmode=os.environ["DB_SSLMODE"],
        ))

    def published_daily_features(self, session_date: date) -> tuple[str, list[dict[str, object]]]:
        with psycopg.connect(self._database_url, row_factory=dict_row) as connection, connection.cursor() as cursor:
            cursor.execute("""
                SELECT r.id::text AS feature_run_id, i.id AS instrument_id, i.symbol, f.prior_close, f.atr_14,
                    f.return_5d_pct, f.return_20d_pct, f.average_daily_volume_20, f.volume_dryup_ratio
                FROM market.daily_features f
                JOIN market.feature_runs r ON r.id = f.feature_run_id AND r.status = 'SUCCEEDED'
                JOIN market.data_readiness ready ON ready.feature_run_id = r.id AND ready.status = 'READY'
                JOIN market.instruments i ON i.id = f.instrument_id AND i.is_active
                WHERE r.session_date = %s
                ORDER BY i.symbol
            """, (session_date,))
            rows = list(cursor.fetchall())
        if not rows:
            raise RuntimeError(f"no backend-published daily features for {session_date}")
        return str(rows[0]["feature_run_id"]), rows

    def save_focus_list(self, session_date: date, feature_run_id: str, policy_version: str, candidates: list[FocusCandidate]) -> str:
        with psycopg.connect(self._database_url) as connection, connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO ai.research_runs (session_date, feature_run_id, policy_version, status, input_snapshot)
                VALUES (%s, %s::uuid, %s, 'RUNNING', jsonb_build_object('candidate_count', %s)) RETURNING id::text
            """, (session_date, feature_run_id, policy_version, len(candidates)))
            research_run_id = cursor.fetchone()[0]
            cursor.execute("""
                INSERT INTO ai.daily_focus_lists (research_run_id, session_date, feature_run_id, status, published_at)
                VALUES (%s::uuid, %s, %s::uuid, 'PUBLISHED', NOW()) RETURNING id::text
            """, (research_run_id, session_date, feature_run_id))
            focus_list_id = cursor.fetchone()[0]
            for candidate in candidates:
                cursor.execute("""
                    INSERT INTO ai.daily_focus_list_items (focus_list_id, instrument_id, rank, state, attention_score, rationale)
                    VALUES (%s::uuid, %s, %s, 'WATCH', %s, %s::jsonb)
                """, (focus_list_id, candidate.instrument_id, candidate.rank, candidate.attention_score, Jsonb(_rationale_json(candidate))))
                cursor.execute("""
                    INSERT INTO ai.observations (research_run_id, instrument_id, category, summary, evidence)
                    VALUES (%s::uuid, %s, 'DAILY_FOCUS', %s, %s::jsonb)
                """, (research_run_id, candidate.instrument_id, f"Rank {candidate.rank} attention candidate: {candidate.symbol}", Jsonb(_rationale_json(candidate))))
            cursor.execute("UPDATE ai.research_runs SET status = 'SUCCEEDED', finished_at = NOW() WHERE id = %s::uuid", (research_run_id,))
        return focus_list_id


def _rationale_json(candidate: FocusCandidate) -> dict[str, object]:
    rationale = asdict(candidate.rationale)
    return {key: float(value) if hasattr(value, "as_tuple") else value for key, value in rationale.items()}
