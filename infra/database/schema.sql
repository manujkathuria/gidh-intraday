-- ==============================================================================
-- GIDH INTRADAY — UNIFIED LEAN TIMESCALEDB SCHEMA
-- Single canonical schema file for market and quant namespaces
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SCHEMA IF NOT EXISTS market;
CREATE SCHEMA IF NOT EXISTS quant;

-- ==============================================================================
-- 1. UNIVERSE & INSTRUMENTS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS market.instruments (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    sector VARCHAR(64) DEFAULT 'OTHERS',
    cash_token BIGINT NOT NULL UNIQUE,
    tick_size NUMERIC(8,4) NOT NULL DEFAULT 0.05,
    lot_size INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instruments_active ON market.instruments(is_active, symbol);
CREATE INDEX IF NOT EXISTS idx_instruments_token ON market.instruments(cash_token);

-- ==============================================================================
-- 2. HISTORICAL & DAILY CASH CANDLES (1D)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS market.cash_candles_1d (
    session_date DATE NOT NULL,
    instrument_id INT NOT NULL REFERENCES market.instruments(id) ON DELETE CASCADE,
    open NUMERIC(12,4) NOT NULL,
    high NUMERIC(12,4) NOT NULL,
    low NUMERIC(12,4) NOT NULL,
    close NUMERIC(12,4) NOT NULL,
    volume BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (instrument_id, session_date)
);

CREATE INDEX IF NOT EXISTS idx_cash_candles_1d_date ON market.cash_candles_1d(session_date DESC);

-- ==============================================================================
-- 3. INTRADAY 1-MINUTE CASH CANDLES HYPERTABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS market.cash_candles_1m (
    ts TIMESTAMPTZ NOT NULL,
    instrument_id INT NOT NULL REFERENCES market.instruments(id) ON DELETE CASCADE,
    open NUMERIC(12,4) NOT NULL,
    high NUMERIC(12,4) NOT NULL,
    low NUMERIC(12,4) NOT NULL,
    close NUMERIC(12,4) NOT NULL,
    volume BIGINT NOT NULL DEFAULT 0,
    source_ts TIMESTAMPTZ,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT create_hypertable('market.cash_candles_1m', 'ts', if_not_exists => TRUE);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_candles_1m ON market.cash_candles_1m(instrument_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_cash_candles_1m_ts ON market.cash_candles_1m(ts DESC);

-- ==============================================================================
-- 4. EOD BATCH RUN TRACKING & METRICS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS market.feature_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_set VARCHAR(32) NOT NULL DEFAULT 'DAILY',
    feature_version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    session_date DATE NOT NULL,
    input_cutoff TIMESTAMPTZ,
    expected_instruments INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    CONSTRAINT uq_feature_runs_date_set UNIQUE (session_date, feature_set)
);

CREATE TABLE IF NOT EXISTS market.data_readiness (
    session_date DATE PRIMARY KEY,
    feature_run_id UUID REFERENCES market.feature_runs(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 5. DAILY FEATURES (PDH, PDL, Prior Close, 20-Day Baseline Volume, ADR)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS market.daily_features (
    id BIGSERIAL PRIMARY KEY,
    feature_run_id UUID NOT NULL REFERENCES market.feature_runs(id) ON DELETE CASCADE,
    instrument_id INT NOT NULL REFERENCES market.instruments(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    prior_close NUMERIC(12,4) NOT NULL,
    prior_high NUMERIC(12,4) NOT NULL,
    prior_low NUMERIC(12,4) NOT NULL,
    prior_volume BIGINT NOT NULL DEFAULT 0,
    avg_volume_20d BIGINT NOT NULL DEFAULT 0,
    adr_pct NUMERIC(8,4) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_daily_features UNIQUE (feature_run_id, instrument_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_features_date ON market.daily_features(session_date DESC, instrument_id);

-- ==============================================================================
-- 6. STREAMLINED INTRADAY FEATURES HYPERTABLE (VWAP, ±1σ, ±2σ, RVOL, CLV)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS market.intraday_features_1m (
    ts TIMESTAMPTZ NOT NULL,
    instrument_id INT NOT NULL REFERENCES market.instruments(id) ON DELETE CASCADE,
    feature_run_id UUID REFERENCES market.feature_runs(id) ON DELETE SET NULL,
    cash_close NUMERIC(12,4) NOT NULL,
    session_open NUMERIC(12,4) NOT NULL,
    session_high NUMERIC(12,4) NOT NULL,
    session_low NUMERIC(12,4) NOT NULL,
    session_vwap NUMERIC(12,4) NOT NULL,
    vwap_upper_1 NUMERIC(12,4),
    vwap_lower_1 NUMERIC(12,4),
    vwap_upper_2 NUMERIC(12,4),
    vwap_lower_2 NUMERIC(12,4),
    relative_volume NUMERIC(8,2) NOT NULL DEFAULT 1.0,
    cumulative_volume BIGINT NOT NULL DEFAULT 0,
    clv NUMERIC(8,4) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT create_hypertable('market.intraday_features_1m', 'ts', if_not_exists => TRUE);
CREATE UNIQUE INDEX IF NOT EXISTS uq_intraday_features_1m ON market.intraday_features_1m(instrument_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_intraday_features_1m_ts ON market.intraday_features_1m(ts DESC);

-- ==============================================================================
-- 7. QUANT BRAIN & WAR ROOM FORENSICS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS quant.brain_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_date DATE NOT NULL,
    brain_id VARCHAR(64) NOT NULL,
    ai_thesis TEXT NOT NULL,
    decisions JSONB NOT NULL DEFAULT '{}'::jsonb,
    sensory_features JSONB,
    outcomes JSONB,
    forensics TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brain_sessions_date ON quant.brain_sessions(session_date DESC, brain_id);

CREATE TABLE IF NOT EXISTS quant.brain_memory (
    brain_id VARCHAR(64) PRIMARY KEY,
    memory_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
