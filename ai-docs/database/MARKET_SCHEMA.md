# Market Schema Documentation (`gidh_intraday.market`)

This document details the PostgreSQL + TimescaleDB schema for all market data tables, hypertables, and materialized views in `gidh_intraday`.

---

## 1. Hypertables (High-Frequency TimescaleDB Partitions)

### `market.cash_candles_1m`
1-minute OHLCV candles for Equity Cash segment.
- **`ts`** (`timestamptz`, PK): Candle start timestamp (IST).
- **`instrument_id`** (`bigint`, PK, FK -> `market.instruments.id`): Cash instrument identifier.
- **`open`**, **`high`**, **`low`**, **`close`** (`numeric(18,4)`): OHLC prices.
- **`volume`** (`bigint`): Candle volume.
- **`source_ts`** (`timestamptz`): Broker tick source timestamp.
- **`received_at`** (`timestamptz`): Ingestion receipt timestamp.
- **`is_complete`** (`boolean`): True if candle is finalized.

### `market.future_candles_1m`
1-minute OHLCV + Open Interest candles for Futures contracts.
- **`ts`** (`timestamptz`, PK): Candle start timestamp.
- **`future_contract_id`** (`bigint`, PK, FK -> `market.future_contracts.id`): Active/historical contract ID.
- **`open`**, **`high`**, **`low`**, **`close`** (`numeric(18,4)`): OHLC prices.
- **`volume`** (`bigint`): Traded volume in shares.
- **`open_interest`** (`bigint`): Open Interest at candle close.
- **`source_ts`**, **`received_at`**, **`is_complete`**: Ingestion metadata.

### `market.intraday_features_1m`
Precomputed 1-minute intraday quantitative metrics & signals.
- **`ts`**, **`instrument_id`**, **`feature_run_id`** (Composite key)
- **Session Range**: `session_open`, `session_high`, `session_low`, `minutes_since_open`
- **Opening Ranges**: `opening_range_15_high/low`, `opening_range_30_high/low`
- **VWAP & Bands**: `session_vwap`, `vwap_sigma`, `vwap_upper_1/2`, `vwap_lower_1/2`, `vwap_distance_sigma`
- **Price Action Mechanics**: `bar_range`, `bar_body`, `clv` (Close Location Value), `upper_wick_pct`, `lower_wick_pct`
- **Volume & Volatility**: `cumulative_volume`, `relative_volume`, `realised_volatility_5m/15m/30m`, `adr_fuel_used_pct`
- **Futures & Order Flow**: `future_contract_id`, `future_close`, `futures_basis`, `futures_basis_pct`, `oi_change_1m/5m/15m/session`

---

## 2. Base Daily Tables

### `market.cash_candles_1d`
Daily OHLCV bars for Equity Cash segment.
- **`session_date`** (`date`, PK)
- **`instrument_id`** (`bigint`, PK, FK -> `market.instruments.id`)
- **`open`**, **`high`**, **`low`**, **`close`** (`numeric(18,4)`)
- **`volume`** (`bigint`), **`turnover`** (`numeric(18,4)`)
- **`source_ts`**, **`received_at`**, **`is_complete`**

### `market.future_candles_1d`
Daily OHLCV + Open Interest for Futures contracts.
- **`session_date`** (`date`, PK)
- **`future_contract_id`** (`bigint`, PK, FK -> `market.future_contracts.id`)
- **`open`**, **`high`**, **`low`**, **`close`** (`numeric(18,4)`)
- **`volume`** (`bigint`), **`open_interest`** (`bigint`), **`oi_day_change`** (`bigint`)

### `market.daily_features`
Precomputed daily structural levels and trend context.
- **`session_date`**, **`instrument_id`** (PK)
- **Levels**: `pdh`, `pdl`, `pdc`, `adx_14`, `atr_14`, `sma_20`, `sma_50`, `sma_200`, `daily_rsi_14`
- **Relative Strength**: `rs_nifty_20d`, `rs_sector_20d`, `momentum_rank`

---

## 3. Reference & Master Tables

### `market.instruments`
Master table for all tracked equities & cash instruments (212 active instruments).
- **`id`** (`bigint`, PK, Identity)
- **`symbol`** (`varchar(32)`, Unique): e.g. `'DIXON'`, `'RELIANCE'`, `'NIFTY 50'`
- **`name`** (`varchar(128)`): Full legal name
- **`exchange`** (`varchar(16)`): `'NSE'` or `'INDICES'`
- **`cash_token`** (`bigint`, Unique): Zerodha Kite token
- **`tick_size`** (`numeric(12,4)`): Minimum price movement (e.g. `0.05`)
- **`sector`** (`varchar(64)`): Sector taxonomy classification
- **`is_active`** (`boolean`): Active tracking status

### `market.future_contracts`
Master table mapping cash instruments to their monthly derivative contracts.
- **`id`** (`bigint`, PK, Identity)
- **`instrument_id`** (`bigint`, FK -> `market.instruments.id`)
- **`token`** (`bigint`, Unique): Zerodha Kite derivative token
- **`trading_symbol`** (`varchar(64)`, Unique): e.g. `'DIXON26SEPFUT'`
- **`expiry`** (`date`): Monthly contract expiry date
- **`lot_size`** (`integer`): Market lot size (e.g. `125`, `250`)
- **`tick_size`** (`numeric(12,4)`)
- **`is_active`** (`boolean`): True for the near-month active traded future

---

## 4. Pipeline Metadata & Quality Control

### `market.ingestion_runs` / `market.feature_runs`
Tracks batch and streaming ETL pipeline execution statuses, start/end timestamps, and summaries.

### `market.data_readiness` / `market.data_coverage`
Validates completeness of tick data and bar counts per trading date before triggering downstream jobs.

### `market.rejected_candles`
Captures malformed, out-of-order, or anomalous candles rejected during validation.

---

## 5. Materialized Views

### `market.mv_daily_structural_context`
Refreshed nightly to supply instant reference levels to trading engines without computing window functions on the fly:
- **`instrument_id`**, **`session_date`**, **`symbol`**
- **`pdh`**, **`pdl`**, **`pdc`**: Previous Day High, Low, Close
- **`high_5d`**, **`low_5d`**: 5-Day swing high/low
- **`high_20d`**, **`low_20d`**: 20-Day swing high/low
- **`is_inside_day`**: True if previous day's range was entirely inside the preceding day
- **`dist_to_pdh_pct`**, **`dist_to_pdl_pct`**: Distance (%) from previous close to key pivot levels
