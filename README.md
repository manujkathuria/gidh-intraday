# Gidh Intraday

Day 0 foundation for an AI-native Indian intraday research system.

The repository currently contains only the market-data batch kernel. It builds
and repairs the canonical TimescaleDB market history and its daily and
one-minute derived features. A new API, frontend, live ingestion path, and AI
runtime will be built separately on this published data contract.

## Commands

From the repository root:

```bash
make auth        # renew the local Kite access token
make universe    # refresh the 210 cash/futures pairs
make history     # seed or repair raw candles
make features    # publish the current daily baseline
make integrity   # repair a closed session only when backend marks it non-ready
make test
```

For the operating contract and schema ownership, start with
[ai-docs/INDEX.md](ai-docs/INDEX.md).

## Principles

- Backend owns data integrity and publication.
- AI trusts backend-published market features; it does not repair or validate data.
- Raw candles are canonical; all feature tables are reproducible.
- Realtime ingestion will be an optional fast path. EOD batch integrity is the repair authority.
