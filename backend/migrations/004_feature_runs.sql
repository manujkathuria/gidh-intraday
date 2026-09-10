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

DROP TABLE IF EXISTS market.daily_features;
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

DROP TABLE IF EXISTS market.intraday_features_1m;
CREATE TABLE market.intraday_features_1m (
    ts TIMESTAMPTZ NOT NULL,
    feature_run_id UUID NOT NULL REFERENCES market.feature_runs(id),
    instrument_id BIGINT NOT NULL REFERENCES market.instruments(id),
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
    PRIMARY KEY (ts, feature_run_id, instrument_id)
);

SELECT create_hypertable('market.intraday_features_1m', 'ts', if_not_exists => TRUE);
CREATE INDEX idx_intraday_features_instrument_ts
    ON market.intraday_features_1m (instrument_id, ts DESC);

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

ALTER TABLE market.data_readiness
    ADD COLUMN IF NOT EXISTS feature_run_id UUID REFERENCES market.feature_runs(id);
