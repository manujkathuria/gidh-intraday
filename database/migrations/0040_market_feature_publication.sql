-- Immutable batch-owned feature baselines. These tables contain mathematics, never AI opinion.

CREATE TABLE IF NOT EXISTS market.feature_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature_set TEXT NOT NULL CHECK (feature_set IN ('DAILY')),
    feature_version TEXT NOT NULL,
    session_date DATE NOT NULL,
    input_cutoff TIMESTAMPTZ NOT NULL,
    expected_instruments INTEGER NOT NULL CHECK (expected_instruments > 0),
    produced_instruments INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('RUNNING', 'SUCCEEDED', 'FAILED')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    error_message TEXT,
    details JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_successful_daily_feature_run
    ON market.feature_runs (feature_set, feature_version, session_date)
    WHERE status = 'SUCCEEDED';

CREATE TABLE market.daily_features (
    feature_run_id UUID NOT NULL REFERENCES market.feature_runs(id),
    instrument_id BIGINT NOT NULL REFERENCES market.instruments(id),
    source_daily_sessions INTEGER NOT NULL,
    prior_close NUMERIC(18, 4) NOT NULL,
    prior_high NUMERIC(18, 4) NOT NULL,
    prior_low NUMERIC(18, 4) NOT NULL,
    prior_week_high NUMERIC(18, 4),
    prior_week_low NUMERIC(18, 4),
    cpr_pivot NUMERIC(18, 4) NOT NULL,
    cpr_bc NUMERIC(18, 4) NOT NULL,
    cpr_tc NUMERIC(18, 4) NOT NULL,
    atr_14 NUMERIC(18, 4) NOT NULL,
    adr_20 NUMERIC(18, 4) NOT NULL,
    sma_20 NUMERIC(18, 4) NOT NULL,
    sma_50 NUMERIC(18, 4) NOT NULL,
    return_5d_pct NUMERIC(10, 4) NOT NULL,
    return_20d_pct NUMERIC(10, 4) NOT NULL,
    distance_20d_high_pct NUMERIC(10, 4) NOT NULL,
    distance_20d_low_pct NUMERIC(10, 4) NOT NULL,
    average_daily_volume_20 BIGINT NOT NULL,
    volume_dryup_ratio NUMERIC(10, 4) NOT NULL,
    futures_oi_latest BIGINT,
    futures_oi_5d_ago BIGINT,
    futures_oi_change_5d_pct NUMERIC(10, 4),
    PRIMARY KEY (feature_run_id, instrument_id)
);

CREATE INDEX idx_daily_features_instrument_run
    ON market.daily_features (instrument_id, feature_run_id);

CREATE TABLE IF NOT EXISTS market.preopen_snapshots (
    session_date DATE NOT NULL,
    instrument_id BIGINT NOT NULL REFERENCES market.instruments(id),
    source_ts TIMESTAMPTZ NOT NULL,
    preopen_price NUMERIC(18, 4),
    previous_close NUMERIC(18, 4) NOT NULL,
    gap_pct NUMERIC(10, 4),
    auction_volume BIGINT,
    expected_auction_volume BIGINT,
    auction_volume_ratio NUMERIC(12, 4),
    is_complete BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (session_date, instrument_id)
);

CREATE TABLE market.data_readiness (
    session_date DATE PRIMARY KEY,
    status VARCHAR(16) NOT NULL CHECK (status IN ('READY', 'NOT_READY')),
    active_instruments INTEGER NOT NULL,
    active_future_contracts INTEGER NOT NULL,
    symbols_with_history INTEGER NOT NULL,
    daily_feature_rows INTEGER NOT NULL,
    feature_run_id UUID REFERENCES market.feature_runs(id),
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    details JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE TABLE market.data_coverage (
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
