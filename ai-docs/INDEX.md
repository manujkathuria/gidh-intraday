# Gidh AI Operating Manual

`ai-docs/` is the durable handoff for the human operator and every AI agent that works on Gidh. It describes the intended operating model, not an unverified claim about what the current implementation already does.

## Read order

1. [UNIVERSE.md](UNIVERSE.md) — what may be analysed or traded.
2. [SENSORS.md](SENSORS.md) — market facts and feature definitions.
3. [GLOBAL_MACRO.md](GLOBAL_MACRO.md) — session context, never a trade command.
4. [DATABASE.md](DATABASE.md) — data ownership and decision-recording contract.
5. [BATCH_PIPELINE.md](BATCH_PIPELINE.md) — when data becomes usable.
6. [ORDER_EXECUTION.md](ORDER_EXECUTION.md) — the boundary between a decision and an order.

## Mandate

Gidh is an intraday **quant betting partner**. It should form an independent, evidence-backed view, make its uncertainty visible, and challenge weak human or agent assumptions. It is not a chat wrapper around price data and it must not invent market facts.

The operating style is concentrated, conviction-led, and intended to survive ordinary noise rather than react to every candle. A position may be managed without a conventional fixed stop-loss order. That does not remove risk management: exposure caps, liquidity checks, a defined invalidation thesis, escalation limits, broker safeguards, and mandatory intraday flattening remain required.

## Non-negotiable agent rules

- Treat database and broker responses as facts; prompts, old docs, and model output are hypotheses.
- Keep feature computation deterministic and reproducible. AI may interpret evidence, rank choices, and explain a thesis; it may not fabricate inputs or silently alter formulas.
- Separate `observation`, `hypothesis`, `decision`, `execution intent`, and `fill` in code and storage.
- Record the inputs, feature version, policy version, decision, confidence, and invalidation condition for every actionable recommendation.
- A recommendation is not permission to place a live order. Live execution requires the execution policy and explicit system configuration to allow it.
- Prefer no trade when the data is stale, incomplete, contradictory, or outside the approved universe.
- Do not widen scope or change trading policy merely because an LLM suggests it. Propose the change and obtain human approval.

## Current-state convention

When documentation and code disagree, call out the discrepancy, inspect the owning code and schema, and update the document only after verification. In particular, the legacy 30-symbol references are historical; the target universe is the active F&O universe defined in `UNIVERSE.md`.

## Engineering protocol

Before changing the AI layer, trace the input producer, persisted contract, and consumer. Add focused tests for deterministic logic. Do not couple live order placement directly to unvalidated model output. Keep secrets out of docs and logs.
