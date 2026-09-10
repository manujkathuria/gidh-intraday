# Market-data Pipeline

The batch and streaming paths create evidence for the AI. Backend owns integrity, completeness, and publication; AI trusts the feature data that backend publishes.

## Lifecycle

| Stage | Typical timing | Output | Backend publication condition |
| --- | --- | --- | --- |
| Instrument sync | Startup / before expiry | cash/future pairs, expiry, lot size | active future is valid for every eligible symbol |
| Historical seed or repair | Bootstrap / ad hoc | daily and minute history | enough history for requested baselines |
| End-of-day ingest and OI stitch | After market close | completed cash and future observations | cash/future timestamps align and OI is valid |
| Baseline computation | Before pre-market decision | ATR, ADR, ADV, volume profiles, feature rows | feature row is dated for the intended session |
| Live stream | During session | ticks, candles, telemetry, broker updates | feed heartbeat is current |

## Day 0 data CLI

The clean backend CLI is `gidh-batch`, implemented in `backend/cmd/gidh-batch`. It has explicit capability subcommands rather than a catch-all mode flag:

```bash
# Refresh the exact active NSE cash / NFO futures universe.
go run ./cmd/gidh-batch instruments sync --expected-count=210

# Initial local seed: 365 calendar days daily, 60 calendar days one-minute history.
go run ./cmd/gidh-batch candles backfill --daily-days=365 --minute-days=60

# Repair one symbol only.
go run ./cmd/gidh-batch candles backfill --symbol=ABB --daily-days=365 --minute-days=60

# Build the pre-market baseline from completed sessions before this session.
go run ./cmd/gidh-batch features daily --session-date=2026-09-10 --version=daily-v1

# Replay raw one-minute bars into neutral intraday market-state facts.
# The command commits every five trading sessions and resumes safely.
go run ./cmd/gidh-batch features intraday backfill --from=2026-07-13 --to=2026-09-10 --version=daily-v1

# EOD repair: exits without Zerodha calls when backend already marked the
# closed session READY; otherwise repairs raw bars and rebuilds its features.
go run ./cmd/gidh-batch integrity eod --session-date=2026-09-10 --version=daily-v1
```

Universe sync refuses to alter the active universe unless Zerodha supplies exactly 210 valid cash/future pairs. Candle backfill is idempotent: valid raw bars upsert by timestamp and instrument identity.

Cash and futures are stored separately in `market.cash_candles_1d`, `market.cash_candles_1m`, `market.future_candles_1d`, and `market.future_candles_1m`. The active contract has shorter historical availability than the continuous cash series; that distinction is intentional.

## Data integrity rules

- Never merge futures data into a cash series without retaining the active future identity and expiry.
- Treat a rollover, missing OI, duplicate bar, or invalid timestamp as a data-quality event that blocks affected decisions.
- Reject malformed OHLC bars rather than normalizing them. Preserve each rejected source row and its reason in `market.rejected_candles` for audit and repair.
- Keep raw observations immutable where possible; derived features can be recomputed under a version.
- Record the freshest available timestamp per source, not merely the job completion time.
- Re-run repairs through the owning ingestion path and confirm downstream baselines are recomputed.

## Feature publication contract

`features daily` is a database-only batch job: it does not need Zerodha credentials and never fetches or mutates raw market bars. It creates one immutable `market.feature_runs` record and derives exactly one `market.daily_features` row for every active instrument. Backend may record its integrity result in `market.data_readiness`; that record is backend-owned.

The daily calculation uses only cash and active-future daily candles strictly before `--session-date`. Its first version publishes prior-session geometry and CPR, 5/20/50-session trend measures, ATR/ADR, 20-session range position, volume baseline/dry-up, and active-future OI with its five-session change. The run is complete only when the produced count equals the active-universe count; otherwise backend marks it `FAILED` and does not publish it to AI.

A successful `(DAILY, version, session_date)` run is immutable and idempotent: repeating the same command returns the already published run. Change `--version` only when the mathematical feature definition changes.

Live processing appends raw observations and calculates session features against the published daily run. It must never silently replace that run's baseline during a trading session.

The intraday replay uses the preceding sessions only to form a causal, rolling minute-of-day volume expectation. It writes current cash OHLC, session geometry, VWAP and explicit sigma bands, opening ranges, volatility, range fuel, futures, OI, and source-completeness facts. It does not write a directional signal or trade instruction; AI joins these facts with the daily baseline to decide whether an entry setup has confirmed.

## EOD maintenance

`integrity eod` is the backend repair path for flexible realtime ingestion. It first reads backend-owned `market.data_readiness`: a `READY` session exits without API calls or recalculation. A missing or non-ready session is re-fetched from Zerodha for that session only, upserted into raw cash/futures daily and minute candles, then has its daily and intraday features rebuilt. AI does not participate in this decision.

## Backend-to-AI publication contract

Backend publishes the current universe and feature run only after its own integrity process succeeds. AI consumes that published state as authoritative; it does not count bars, inspect coverage, or make a separate readiness decision.

Before producing analysis, AI uses the published universe, the relevant daily feature run, and the available intraday features. Any repair, missing-data decision, or delayed publication is a backend concern.
