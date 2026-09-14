# Gidh Backend Documentation Index

`backend/ai-docs/` contains architectural specifications and data contracts for the Go market-data ingestion and backend pipelines.

---

## Read Order

1. [DATABASE.md](DATABASE.md) — TimescaleDB data ownership, market schema, and candle storage.
2. [BATCH_PIPELINE.md](BATCH_PIPELINE.md) — Batch ingestion, feature calculation pipelines, and EOD integrity gates.
3. [ORDER_EXECUTION.md](ORDER_EXECUTION.md) — Broker order execution, risk safeguards, and state transitions.

---

## Related Documentation

- **Trade Universe**: Located at root [`/UNIVERSE.md`](../../UNIVERSE.md) — Defines the 210-stock liquid F&O universe.
- **Quant & Strategy Playbook**: Located at [`quant/ai-docs/`](../../quant/ai-docs/) — Playbook tactics, Scout radar engine, War Room schedule, and checkpoint trailing rules.
