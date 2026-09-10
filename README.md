# Gidh Intraday

Day 0 foundation for an AI-native Indian intraday research system.

The repository currently contains the market-data batch kernel and a minimal,
read-only local API. The batch process builds and repairs canonical TimescaleDB
market history and daily/one-minute derived features; the API exposes only
backend-certified data for the future UI and AI runtime.

## Commands

From the repository root:

```bash
make auth        # renew the local Kite access token
make universe    # refresh the 210 cash/futures pairs
make history     # seed or repair raw candles
make features    # publish the current daily baseline
make integrity   # repair a closed session only when backend marks it non-ready
make ai-test     # run AI read-layer tests
make test
```

Start the local read API with:

```bash
cd backend && go run ./cmd/gidh-api
```

It listens on `127.0.0.1:8080` by default (`GIDH_API_ADDR` overrides this) and
provides `GET /healthz`, `GET /v1/market/universe`,
`GET /v1/market/sessions`, `GET /v1/market/daily-features?session_date=YYYY-MM-DD`,
and `GET /v1/market/intraday-features?session_date=YYYY-MM-DD&symbol=SYMBOL`.

For the operating contract and schema ownership, start with
[ai-docs/INDEX.md](ai-docs/INDEX.md).

## Principles

- Backend owns data integrity and publication.
- AI trusts backend-published market features; it does not repair or validate data.
- Raw candles are canonical; all feature tables are reproducible.
- Realtime ingestion will be an optional fast path. EOD batch integrity is the repair authority.
