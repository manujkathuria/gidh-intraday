from __future__ import annotations

import os
from dataclasses import asdict
from datetime import date
from decimal import Decimal
from urllib.parse import quote

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from gidh_ai.research.focus import FocusCandidate
from gidh_ai.research.directional_selector import DirectionalDecision


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
                SELECT r.id::text AS feature_run_id, i.id AS instrument_id, i.symbol, f.prior_close,
                    f.prior_high, f.prior_low, f.cpr_pivot, f.atr_14, f.return_5d_pct, f.return_20d_pct,
                    f.distance_20d_high_pct, f.distance_20d_low_pct, f.average_daily_volume_20,
                    f.volume_dryup_ratio, f.futures_oi_change_5d_pct
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

    def save_focus_list(self, session_date: date, feature_run_id: str, policy_version: str, candidates: list[FocusCandidate], model_version: str | None = None, input_snapshot: dict[str, object] | None = None) -> str:
        with psycopg.connect(self._database_url) as connection, connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO ai.research_runs (session_date, feature_run_id, policy_version, model_version, status, input_snapshot)
                VALUES (%s, %s::uuid, %s, %s, 'RUNNING', %s::jsonb) RETURNING id::text
            """, (session_date, feature_run_id, policy_version, model_version, Jsonb(input_snapshot or {"candidate_count": len(candidates)})))
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

    def save_directional_decisions(self, session_date: date, feature_run_id: str, decisions: list[DirectionalDecision], model_version: str, input_snapshot: dict[str, object]) -> str:
        with psycopg.connect(self._database_url) as connection, connection.cursor() as cursor:
            cursor.execute("INSERT INTO ai.research_runs (session_date,feature_run_id,policy_version,model_version,status,input_snapshot,finished_at) VALUES (%s,%s::uuid,'directional-gemini-v1',%s,'SUCCEEDED',%s::jsonb,NOW()) RETURNING id::text", (session_date, feature_run_id, model_version, Jsonb(input_snapshot)))
            run_id = cursor.fetchone()[0]
            cursor.execute("INSERT INTO ai.daily_focus_lists (research_run_id,session_date,feature_run_id,status,published_at) VALUES (%s::uuid,%s,%s::uuid,'PUBLISHED',NOW()) RETURNING id::text", (run_id, session_date, feature_run_id))
            list_id = cursor.fetchone()[0]
            for item in decisions:
                details = {"side": item.side, "hypothesis_family": item.hypothesis_family}
                cursor.execute("INSERT INTO ai.daily_focus_list_items (focus_list_id,instrument_id,rank,state,attention_score,rationale) VALUES (%s::uuid,%s,%s,'WATCH',%s,%s::jsonb)", (list_id,item.instrument_id,item.rank,item.confidence,Jsonb(details)))
                cursor.execute("INSERT INTO ai.decisions (research_run_id,instrument_id,state,confidence,thesis,invalidation,human_status,details) VALUES (%s::uuid,%s,%s,%s,%s,%s,'PENDING',%s::jsonb)", (run_id,item.instrument_id,item.side,item.confidence,item.thesis,item.invalidation,Jsonb(details)))
                cursor.execute("INSERT INTO ai.observations (research_run_id,instrument_id,category,summary,evidence) VALUES (%s::uuid,%s,'DAILY_FOCUS',%s,%s::jsonb)", (run_id,item.instrument_id,f"{item.side} Gemini directional candidate, rank {item.rank}",Jsonb(details)))
            return list_id

    def publish_live_market_subscriptions(self, research_run_id: str) -> int:
        """Publish the sealed directional decisions as the backend's live feed contract."""
        with psycopg.connect(self._database_url) as connection, connection.cursor() as cursor:
            cursor.execute("""
                SELECT session_date FROM ai.research_runs WHERE id=%s::uuid
            """, (research_run_id,))
            run = cursor.fetchone()
            if not run:
                raise RuntimeError(f"unknown research run: {research_run_id}")
            session_date = run[0]
            cursor.execute("""
                SELECT COUNT(*), COUNT(DISTINCT research_run_id)
                FROM ai.live_market_subscriptions WHERE session_date=%s
            """, (session_date,))
            existing_count, existing_runs = cursor.fetchone()
            if existing_count:
                if existing_count != 15 or existing_runs != 1:
                    raise RuntimeError(f"invalid existing live subscription set for {session_date}")
                cursor.execute("""
                    SELECT COUNT(*) FROM ai.live_market_subscriptions
                    WHERE session_date=%s AND research_run_id=%s::uuid
                """, (session_date, research_run_id))
                if cursor.fetchone()[0] != 15:
                    raise RuntimeError(f"a different run already owns live subscriptions for {session_date}")
                return 15
            cursor.execute("""
                INSERT INTO ai.live_market_subscriptions (
                    session_date, instrument_id, research_run_id, decision_id, side, priority, confidence,
                    subscription_starts_at, subscription_ends_at, metadata
                )
                SELECT r.session_date, d.instrument_id, r.id, d.id, d.state, item.rank, d.confidence,
                    (r.session_date + TIME '09:00:00') AT TIME ZONE 'Asia/Kolkata',
                    (r.session_date + TIME '15:30:00') AT TIME ZONE 'Asia/Kolkata',
                    jsonb_build_object('hypothesis_family', d.details->>'hypothesis_family')
                FROM ai.research_runs r
                JOIN ai.decisions d ON d.research_run_id=r.id
                JOIN ai.daily_focus_lists list ON list.research_run_id=r.id
                JOIN ai.daily_focus_list_items item
                    ON item.focus_list_id=list.id AND item.instrument_id=d.instrument_id
                WHERE r.id=%s::uuid AND list.status='PUBLISHED' AND d.state IN ('LONG', 'SHORT')
                ORDER BY item.rank
            """, (research_run_id,))
            if cursor.rowcount != 15:
                raise RuntimeError(f"expected 15 live subscriptions, published {cursor.rowcount}")
            return cursor.rowcount

    def evaluate_directional_run(self, session_date: date) -> tuple[str, list[dict[str, object]]]:
        with psycopg.connect(self._database_url, row_factory=dict_row) as connection, connection.cursor() as cursor:
            cursor.execute("""
                SELECT id::text FROM ai.research_runs r WHERE r.session_date=%s AND r.input_snapshot->>'research_track'='directional-v1'
                AND NOT EXISTS (SELECT 1 FROM ai.observations o WHERE o.research_run_id=r.id AND o.category='DIRECTIONAL_EOD_EVALUATION')
                ORDER BY r.started_at DESC LIMIT 1
            """, (session_date,))
            row = cursor.fetchone()
            if not row:
                raise RuntimeError(f"no unevaluated Gemini directional run for {session_date}")
            run_id = row["id"]
            cursor.execute("""
                WITH refs AS (SELECT instrument_id,close AS reference_close FROM market.cash_candles_1m WHERE (ts AT TIME ZONE 'Asia/Kolkata')::date=%s AND (ts AT TIME ZONE 'Asia/Kolkata')::time=TIME '09:30:00'),
                path AS (SELECT instrument_id,MAX(high) AS path_high,MIN(low) AS path_low FROM market.cash_candles_1m WHERE (ts AT TIME ZONE 'Asia/Kolkata')::date=%s AND (ts AT TIME ZONE 'Asia/Kolkata')::time>TIME '09:30:00' GROUP BY instrument_id)
                SELECT d.instrument_id,i.symbol,d.state,d.details,refs.reference_close,dc.close AS session_close,path.path_high,path.path_low,
                  ROUND((CASE WHEN d.state='LONG' THEN (dc.close/refs.reference_close-1)*100 ELSE (refs.reference_close/dc.close-1)*100 END)::numeric,4) AS directional_return_pct,
                  ROUND((CASE WHEN d.state='LONG' THEN (path.path_high/refs.reference_close-1)*100 ELSE (refs.reference_close/path.path_low-1)*100 END)::numeric,4) AS mfe_pct,
                  ROUND((CASE WHEN d.state='LONG' THEN (path.path_low/refs.reference_close-1)*100 ELSE (refs.reference_close/path.path_high-1)*100 END)::numeric,4) AS mae_pct
                FROM ai.decisions d JOIN refs ON refs.instrument_id=d.instrument_id JOIN path ON path.instrument_id=d.instrument_id
                JOIN market.instruments i ON i.id=d.instrument_id JOIN market.cash_candles_1d dc ON dc.instrument_id=d.instrument_id AND dc.session_date=%s
                WHERE d.research_run_id=%s::uuid ORDER BY d.confidence DESC
            """, (session_date, session_date, session_date, run_id))
            outcomes = list(cursor.fetchall())
            if len(outcomes) != 15:
                raise RuntimeError("incomplete 09:30-to-close data for directional evaluation")
            for outcome in outcomes:
                evidence = _jsonable(dict(outcome))
                cursor.execute("INSERT INTO ai.observations (research_run_id,instrument_id,category,summary,evidence) VALUES (%s::uuid,%s,'DIRECTIONAL_EOD_EVALUATION',%s,%s::jsonb)", (run_id, outcome["instrument_id"], f"{outcome['state']} EOD directional return {outcome['directional_return_pct']}%", Jsonb(evidence)))
        return run_id, outcomes

    def save_directional_learning(self, research_run_id: str, learning: dict[str, object]) -> None:
        with psycopg.connect(self._database_url) as connection, connection.cursor() as cursor:
            cursor.execute("UPDATE ai.research_runs SET input_snapshot=jsonb_set(input_snapshot,'{eod_learning}',%s::jsonb,true),finished_at=NOW() WHERE id=%s::uuid", (Jsonb(learning), research_run_id))


def _rationale_json(candidate: FocusCandidate) -> dict[str, object]:
    rationale = asdict(candidate.rationale)
    return {key: float(value) if hasattr(value, "as_tuple") else value for key, value in rationale.items()}


def _jsonable(value: object) -> object:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, dict):
        return {str(key): _jsonable(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_jsonable(item) for item in value]
    return value
