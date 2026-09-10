-- Day 0 market-data spine. Backend owns every table in this schema.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS market.instruments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    symbol VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    exchange VARCHAR(16) NOT NULL DEFAULT 'NSE',
    cash_token BIGINT NOT NULL UNIQUE,
    tick_size NUMERIC(12, 4) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS market.future_contracts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    instrument_id BIGINT NOT NULL REFERENCES market.instruments(id),
    token BIGINT NOT NULL UNIQUE,
    trading_symbol VARCHAR(64) NOT NULL UNIQUE,
    expiry DATE NOT NULL,
    lot_size INTEGER NOT NULL CHECK (lot_size > 0),
    tick_size NUMERIC(12, 4) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (instrument_id, expiry)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_future_per_instrument
    ON market.future_contracts (instrument_id)
    WHERE is_active;

CREATE TABLE IF NOT EXISTS market.cash_candles_1m (
    ts TIMESTAMPTZ NOT NULL,
    instrument_id BIGINT NOT NULL REFERENCES market.instruments(id),
    open NUMERIC(18, 4) NOT NULL,
    high NUMERIC(18, 4) NOT NULL,
    low NUMERIC(18, 4) NOT NULL,
    close NUMERIC(18, 4) NOT NULL,
    volume BIGINT NOT NULL CHECK (volume >= 0),
    source_ts TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_complete BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (ts, instrument_id),
    CHECK (high >= low),
    CHECK (high >= open AND high >= close),
    CHECK (low <= open AND low <= close)
);

SELECT create_hypertable('market.cash_candles_1m', 'ts', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_cash_candles_instrument_ts
    ON market.cash_candles_1m (instrument_id, ts DESC);

CREATE TABLE IF NOT EXISTS market.future_candles_1m (
    ts TIMESTAMPTZ NOT NULL,
    future_contract_id BIGINT NOT NULL REFERENCES market.future_contracts(id),
    open NUMERIC(18, 4) NOT NULL,
    high NUMERIC(18, 4) NOT NULL,
    low NUMERIC(18, 4) NOT NULL,
    close NUMERIC(18, 4) NOT NULL,
    volume BIGINT NOT NULL CHECK (volume >= 0),
    open_interest BIGINT NOT NULL CHECK (open_interest >= 0),
    source_ts TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_complete BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (ts, future_contract_id),
    CHECK (high >= low),
    CHECK (high >= open AND high >= close),
    CHECK (low <= open AND low <= close)
);

SELECT create_hypertable('market.future_candles_1m', 'ts', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_future_candles_contract_ts
    ON market.future_candles_1m (future_contract_id, ts DESC);

CREATE TABLE IF NOT EXISTS market.daily_features (
    session_date DATE NOT NULL,
    instrument_id BIGINT NOT NULL REFERENCES market.instruments(id),
    feature_version TEXT NOT NULL,
    calculated_at TIMESTAMPTZ NOT NULL,
    prior_close NUMERIC(18, 4) NOT NULL,
    prior_high NUMERIC(18, 4) NOT NULL,
    prior_low NUMERIC(18, 4) NOT NULL,
    prior_week_high NUMERIC(18, 4),
    prior_week_low NUMERIC(18, 4),
    cpr_pivot NUMERIC(18, 4),
    cpr_bc NUMERIC(18, 4),
    cpr_tc NUMERIC(18, 4),
    atr_14 NUMERIC(18, 4),
    adr_20 NUMERIC(18, 4),
    sma_20 NUMERIC(18, 4),
    sma_50 NUMERIC(18, 4),
    return_5d_pct NUMERIC(10, 4),
    return_20d_pct NUMERIC(10, 4),
    distance_20d_high_pct NUMERIC(10, 4),
    distance_20d_low_pct NUMERIC(10, 4),
    average_daily_volume_20 BIGINT,
    average_delivery_pct_20 NUMERIC(10, 4),
    futures_oi_change_5d_pct NUMERIC(10, 4),
    PRIMARY KEY (session_date, instrument_id, feature_version)
);

CREATE INDEX IF NOT EXISTS idx_daily_features_instrument_date
    ON market.daily_features (instrument_id, session_date DESC);

CREATE TABLE IF NOT EXISTS market.intraday_features_1m (
    ts TIMESTAMPTZ NOT NULL,
    instrument_id BIGINT NOT NULL REFERENCES market.instruments(id),
    feature_version TEXT NOT NULL,
    cash_source_ts TIMESTAMPTZ NOT NULL,
    future_source_ts TIMESTAMPTZ,
    session_open NUMERIC(18, 4) NOT NULL,
    session_high NUMERIC(18, 4) NOT NULL,
    session_low NUMERIC(18, 4) NOT NULL,
    session_vwap NUMERIC(18, 4),
    vwap_sd_1 NUMERIC(18, 4),
    vwap_sd_2 NUMERIC(18, 4),
    bar_range NUMERIC(18, 4) NOT NULL,
    bar_body NUMERIC(18, 4) NOT NULL,
    clv NUMERIC(10, 6),
    upper_wick_pct NUMERIC(10, 6),
    lower_wick_pct NUMERIC(10, 6),
    cumulative_volume BIGINT NOT NULL,
    expected_cumulative_volume BIGINT,
    relative_volume NUMERIC(12, 4),
    realised_volatility_5m NUMERIC(12, 6),
    realised_volatility_15m NUMERIC(12, 6),
    realised_volatility_30m NUMERIC(12, 6),
    session_range_pct_atr NUMERIC(12, 6),
    adr_fuel_used_pct NUMERIC(12, 6),
    future_contract_id BIGINT REFERENCES market.future_contracts(id),
    future_close NUMERIC(18, 4),
    futures_basis NUMERIC(18, 4),
    oi_change_1m BIGINT,
    oi_change_5m BIGINT,
    oi_change_15m BIGINT,
    oi_change_session BIGINT,
    PRIMARY KEY (ts, instrument_id, feature_version)
);

SELECT create_hypertable('market.intraday_features_1m', 'ts', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_intraday_features_instrument_ts
    ON market.intraday_features_1m (instrument_id, ts DESC);

CREATE TABLE IF NOT EXISTS market.ingestion_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline VARCHAR(64) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    status VARCHAR(16) NOT NULL CHECK (status IN ('RUNNING', 'SUCCEEDED', 'FAILED')),
    requested_from TIMESTAMPTZ,
    requested_to TIMESTAMPTZ,
    summary JSONB NOT NULL DEFAULT '{}'::JSONB,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS market.data_coverage (
    session_date DATE NOT NULL,
    instrument_id BIGINT NOT NULL REFERENCES market.instruments(id),
    data_set VARCHAR(32) NOT NULL,
    expected_rows INTEGER NOT NULL CHECK (expected_rows >= 0),
    received_rows INTEGER NOT NULL CHECK (received_rows >= 0),
    first_ts TIMESTAMPTZ,
    last_ts TIMESTAMPTZ,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (session_date, instrument_id, data_set)
);

CREATE TABLE IF NOT EXISTS market.data_readiness (
    session_date DATE PRIMARY KEY,
    status VARCHAR(16) NOT NULL CHECK (status IN ('READY', 'NOT_READY')),
    active_instruments INTEGER NOT NULL,
    active_future_contracts INTEGER NOT NULL,
    symbols_with_history INTEGER NOT NULL,
    daily_feature_rows INTEGER NOT NULL,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    details JSONB NOT NULL DEFAULT '{}'::JSONB
);
