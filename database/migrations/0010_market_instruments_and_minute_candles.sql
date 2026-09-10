-- Day 0 market-data spine. Backend owns every table in this schema.

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
