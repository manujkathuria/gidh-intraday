# Gidh Intraday — Database & TimescaleDB Architecture

Gidh Intraday uses PostgreSQL with TimescaleDB extensions for high-frequency market data, pre-computed daily baselines, and quant war room records.

---

## 1. Schema Design Principles

1. **Lean Footprint**: We only store features and indicators required for trading and screening. Unused futures tables and redundant columns have been eliminated.
2. **Hypertables for Time-Series**: 1-minute candle bars and derived intraday features use TimescaleDB hypertables partitioned by timestamp (`ts`) for fast interval rollups and index scans.
3. **Single Canonical Schema**: All table definitions, hypertables, and indexes are defined in a single idempotent file: [`infra/database/schema.sql`](file:///Users/manujkathuria/workspace/gidh/gidh-intraday/infra/database/schema.sql).

---

## 2. Table Catalog

### `market` Namespace

| Table | Type | Purpose | Primary Key / Index |
| :--- | :--- | :--- | :--- |
| **`market.instruments`** | Relational | 210 F&O cash stock metadata, Kite tokens, tick sizes, and sector mapping. | `id` (PK), `symbol` (UQ), `cash_token` (UQ) |
| **`market.cash_candles_1d`** | Relational | 365-day historical daily OHLCV bars for baseline calculations. | `(instrument_id, session_date)` |
| **`market.cash_candles_1m`** | **Hypertable** | 60-day historical and real-time 1-minute OHLCV candles. | `(instrument_id, ts DESC)` |
| **`market.feature_runs`** | Relational | EOD batch execution tracking, input cutoffs, and completion status. | `id` (UUID), `(session_date, feature_set)` |
| **`market.data_readiness`** | Relational | Daily readiness gate (`READY` / `FAILED`) verifying data before 09:15 AM market open. | `session_date` (PK) |
| **`market.daily_features`** | Relational | Immutable pre-market baselines: `prior_high` (PDH), `prior_low` (PDL), `prior_close`, `avg_volume_20d`, and `adr_pct`. | `(feature_run_id, instrument_id)` |
| **`market.intraday_features_1m`** | **Hypertable** | 1-minute derived indicators: `session_vwap`, `vwap_upper_1/2`, `vwap_lower_1/2`, `relative_volume` (RVOL), and `clv`. | `(instrument_id, ts DESC)` |

---

### `quant` Namespace

| Table | Type | Purpose | Primary Key / Index |
| :--- | :--- | :--- | :--- |
| **`quant.brain_sessions`** | Relational | War Room session theses, trading decisions, sensory feature snapshots, and post-market forensics. | `id` (PK), `(session_date DESC, brain_id)` |
| **`quant.brain_memory`** | Relational | Persistent state memory across cognitive macro reasoning sessions. | `brain_id` (PK) |

---

## 3. Core Indicators Stored

- **Session VWAP**: $\text{VWAP} = \frac{\sum (\text{Typical Price} \times \text{Volume})}{\sum \text{Volume}}$
- **Standard Deviation Bands ($\pm 1\sigma, \pm 2\sigma$)**:
  $$\sigma = \sqrt{\frac{\sum \text{Volume} \times (\text{Typical Price} - \text{VWAP})^2}{\sum \text{Volume}}}$$
  $$\text{Upper}_1 = \text{VWAP} + \sigma, \quad \text{Lower}_1 = \text{VWAP} - \sigma$$
  $$\text{Upper}_2 = \text{VWAP} + 2\sigma, \quad \text{Lower}_2 = \text{VWAP} - 2\sigma$$
- **Relative Volume (RVOL)**:
  $$\text{RVOL} = \frac{\text{Cumulative Volume at Minute } t}{\text{Expected Minute-of-Day Volume (from 20D Baseline)}}$$
- **Close Location Value (CLV)**:
  $$\text{CLV} = \frac{(\text{Close} - \text{Low}) - (\text{High} - \text{Close})}{\text{High} - \text{Low}}$$
- **Prior Day Geometry**: `PDH` (Prior Day High), `PDL` (Prior Day Low), `Prior Close`.

---

## 4. Initialization & Migration

To apply the full schema cleanly on local PostgreSQL or production TimescaleDB:

```bash
# On local machine or inside Docker container
psql "postgres://postgres:password@localhost:5432/gidh_intraday?sslmode=disable" -f infra/database/schema.sql
```
