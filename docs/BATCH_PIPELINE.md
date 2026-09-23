# Gidh Intraday — Batch Data Pipeline

The Batch Pipeline prepares historical baselines, syncs the trading universe, and derives structural indicators before the market opens so that the live trading engine and AI strategies operate on clean, immutable facts.

---

## 1. High-Level Architecture

```text
Zerodha Kite Connect
       │ (REST)
       ▼
[ gidh-batch CLI ]
       │
       ├─► 1. Universe Sync  ──► market.instruments (210 F&O Cash Stocks)
       ├─► 2. Candle Ingestion──► market.cash_candles_1d & market.cash_candles_1m
       ├─► 3. Daily Baselines ──► market.feature_runs & market.daily_features (PDH, PDL, 20D Vol, ADR)
       └─► 4. Intraday Features─► market.intraday_features_1m (VWAP, ±1σ, ±2σ, RVOL, CLV)
```

---

## 2. Pipeline Lifecycle & Operating Schedule

| Stage | Schedule | Output | Primary Goal |
| :--- | :--- | :--- | :--- |
| **1. Universe Sync** | Mon-Fri 08:45 AM | `market.instruments` | Sync exactly 210 active NSE F&O cash instruments with valid Kite tokens and sector tags. |
| **2. Pre-Market Baseline** | Mon-Fri 08:50 AM | `market.daily_features` | Compute prior-day levels (**PDH**, **PDL**, **Prior Close**), 20-day average volume, and ADR% fuel. |
| **3. Live Ingestion** | Mon-Fri 09:15–15:30 | `market.cash_candles_1m` | 210-stock WebSocket ticks aggregated into 1m bars and enriched with real-time VWAP + bands. |
| **4. EOD Settlement** | Mon-Fri 15:45 PM | `market.data_readiness` | Verify candle completeness, compute final daily features, and seal session as `READY`. |

---

## 3. CLI Commands Reference (`gidh-batch`)

The batch engine is compiled into `backend/bin/gidh-batch` (or run directly via `make` / `go run`).

### A. Universe Discovery & Token Sync
Syncs all liquid NSE F&O instruments and resolves sector classifications:
```bash
# Via Makefile
make universe

# Direct CLI
cd backend && go run ./cmd/gidh-batch instruments sync --expected-count=210
```

### B. Historical Candles Backfill
Backfills historical daily (365 days) and 1-minute (60 days) raw candles from Kite:
```bash
# Seed all 210 stocks
cd backend && go run ./cmd/gidh-batch candles backfill --daily-days=365 --minute-days=60

# Backfill a single stock (e.g. for repairs)
cd backend && go run ./cmd/gidh-batch candles backfill --symbol=BAJFINANCE --daily-days=365 --minute-days=60
```

### C. Daily Baseline Feature Derivation
Runs a **pure SQL database job** without external Kite API calls. It derives `PDH`, `PDL`, `prior_close`, `avg_volume_20d`, and `adr_pct` for the specified session date:
```bash
# Derive for today or a specific date
cd backend && go run ./cmd/gidh-batch features daily --session-date=2026-09-23 --version=daily-v1
```

### D. Intraday Features & Indicators Replay
Calculates session-level indicators (Session VWAP, $\pm 1\sigma, \pm 2\sigma$ standard deviation bands, RVOL, and CLV) across 1-minute historical bars:
```bash
cd backend && go run ./cmd/gidh-batch features intraday backfill --from=2026-08-01 --to=2026-09-23 --version=daily-v1
```

### E. End-of-Day (EOD) Settlement & Integrity
Verifies data coverage, reconciles trades, and marks the session readiness flag in `market.data_readiness`:
```bash
# Via Makefile
make eod

# Direct CLI
cd backend && go run ./cmd/gidh-batch eod --session-date=2026-09-23
```

---

## 4. Key Database Tables & Schemas

- **`market.instruments`**: Symbol, cash token, tick size, lot size, sector, and active status.
- **`market.cash_candles_1d`**: Daily historical OHLCV data.
- **`market.cash_candles_1m`**: TimescaleDB hypertable for 1-minute historical and live bars.
- **`market.daily_features`**: Immutable daily baselines for each session (`prior_high`, `prior_low`, `prior_close`, `avg_volume_20d`, `adr_pct`).
- **`market.intraday_features_1m`**: TimescaleDB hypertable with computed `session_vwap`, `vwap_upper_1/2`, `vwap_lower_1/2`, `relative_volume`, and `clv`.
- **`market.data_readiness`**: Records session status (`READY` / `FAILED`) so live trading only starts on verified data.

---

## 5. Core Operational Invariants

1. **Strict Immutability**: Historical daily feature runs (`market.daily_features`) are immutable for any given `(session_date, version)`. They are never updated mid-session.
2. **Lean Indicators**: We only persist and stream what the strategy trades on: **PDH/PDL**, **VWAP**, **$\pm 1\sigma, \pm 2\sigma$ Bands**, and **RVOL**.
3. **Data Readiness Guarantee**: The live trading engine checks `market.data_readiness` at 09:15:00 AM before allowing automated order placements.
