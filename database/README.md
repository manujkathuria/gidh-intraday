# Database contract

`migrations/` is the shared, ordered database contract for batch, future AI,
and future API services. PostgreSQL schemas define ownership:

- `market` — backend/batch market data and deterministic features;
- `ai` — AI decisions, evidence, policies, and evaluation records;
- `execution` — future execution audit records.

Migration names use a four-digit global order followed by the owned capability.
Applied migrations are immutable. Add a new migration for every production
schema change; never edit an applied file. The current files are a fresh Day 0
bootstrap and must be applied to a new TimescaleDB database in lexical order.
