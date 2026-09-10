# Gidh AI

The AI layer interprets market facts published by the Go backend. It does not
query TimescaleDB, fetch broker data, repair data, or submit orders.

## Run

Start the backend API first, then run:

```bash
cd ai
python3 -m gidh_ai sessions
python3 -m gidh_ai daily 2026-09-10
python3 -m gidh_ai intraday 2026-09-10 RELIANCE
python3 -m gidh_ai focus 2026-09-10
python3 -m gidh_ai daily-stock-selector inception --session-date=2026-09-01
```

Set `GIDH_API_URL` to use a non-default API address. The default is
`http://127.0.0.1:8080`.

The `focus` command requires the declared PostgreSQL dependency and database
environment settings. It reads backend-certified `market.*` facts directly and
writes only AI-owned `ai.*` records.

`daily-stock-selector inception` also requires `GEMINI_API_KEY` and
`GEMINI_MODEL`. It uses only the selected session's backend-published daily
features; later sessions are never supplied to Gemini.

## Layout

- `gidh_ai.client`: typed HTTP boundary to the Go read API.
- `gidh_ai.models`: market facts and AI-owned, neutral records.
- `gidh_ai.research`: deterministic session views; no trading policy yet.
- `gidh_ai.journal`: validated manual trade-outcome records; persistence comes
  only after the `ai` database schema exists.
- `gidh_ai.store`: direct PostgreSQL reader for `market.*` and writer for
  AI-owned `ai.*` records.
