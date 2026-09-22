# Data and Decision Records

TimescaleDB is the evidence store for Gidh. Database names, columns, and migrations must be verified from the active schema before code changes. This document defines ownership and the target decision-recording model; it deliberately does not publish credentials.

## Ownership

| Data class | Owner | Examples |
| --- | --- | --- |
| Instrument identity and eligibility | ingestion / store | `market.instruments`, `market.future_contracts` |
| Raw and derived market evidence | ingestion / market / sensor | `market.cash_candles_1d`, `market.cash_candles_1m`, `market.daily_features` |
| Live execution state | broker and reconciliation | Zerodha/Kite is authoritative; Redis is a cache |
| Durable execution audit | backend | orders and fill history |
| AI decisions and evaluation | AI layer | focus lists, decisions, outcomes, policy versions |

## Core market tables

- `market.instruments`: tradeable cash equity identity and token.
- `market.future_contracts`: separately identified active futures contract, expiry, lot size, and token.
- `market.cash_candles_1d` / `market.cash_candles_1m`: raw cash history.
- `market.future_candles_1d` / `market.future_candles_1m`: raw futures history and open interest.
- `market.rejected_candles`: source bars rejected by validation, with their reason.
- `market.feature_runs`: immutable batch publication record, including input cutoff, version, completeness, and error state.
- `market.daily_features`: one batch-derived baseline row per active instrument, keyed by `feature_run_id`.
- `market.intraday_features_1m`: neutral one-minute market state keyed to the daily run whose baseline it uses. It contains current/session price geometry, VWAP and explicit sigma bands, participation, volatility, opening-range, futures, and OI facts; it never contains an AI side, score, or order instruction.
- `market.data_readiness`: backend-owned integrity and publication record for a session, with its `feature_run_id`. AI does not interpret this table; backend exposes only the feature data it has approved.

## Live selection handoff

`ai.live_market_subscriptions` is the explicit AI-to-backend contract for the
realtime feed. After a directional research run is sealed, AI publishes exactly
15 rows for that session: the instrument reference, LONG/SHORT side, priority,
confidence, source decision, and the Asia/Kolkata 09:00–15:30 subscription
window. The backend reads `PUBLISHED` rows and joins `market.instruments` and
the active `market.future_contracts` row to obtain feed tokens. It must not
infer a live list from focus-list tables or mutate this AI-owned delivery
record. Cancelling a selection is an explicit AI status change, not a delete.

The old `public` application tables are not part of Day 0. New AI work must use its own `ai` schema and must reference the published `market.feature_runs` input rather than copying market facts into opinion tables.

## Target AI audit contract

Every AI output that could influence attention or capital should be reconstructable. Persist or reference:

1. session date and `as_of` timestamp;
2. symbol and active futures contract identity;
3. immutable input snapshot or a reproducible snapshot reference;
4. feature, policy, and model/prompt versions;
5. observations, hypothesis, decision state, confidence, and contradictions;
6. proposed exposure and invalidation condition;
7. human/execution authorisation status;
8. broker order IDs, fills, and outcome metrics when executed.

`decision` records must be append-only. Corrections, withdrawals, and re-evaluations create a new record linked to the prior decision; they do not rewrite history.

## Schema-change protocol

Add a migration before relying on a new field or table. Backfill only with a documented source and version. Update the owning API and tests together. Never hide a database error by substituting fabricated values.
