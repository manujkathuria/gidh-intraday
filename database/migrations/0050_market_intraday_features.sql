-- Intraday features are neutral market-state facts. AI owns setup and trigger
-- interpretation; this table never stores a side, score, or trade instruction.
--
-- Every row is reproducible from immutable raw candles and a published daily
-- feature run.

CREATE TABLE market.intraday_features_1m (
    ts TIMESTAMPTZ NOT NULL,
    feature_run_id UUID NOT NULL REFERENCES market.feature_runs(id),
    instrument_id BIGINT NOT NULL REFERENCES market.instruments(id),

    cash_source_ts TIMESTAMPTZ NOT NULL,
    future_source_ts TIMESTAMPTZ,
    cash_is_complete BOOLEAN NOT NULL,
    future_is_complete BOOLEAN NOT NULL DEFAULT FALSE,

    cash_open NUMERIC(18, 4) NOT NULL,
    cash_high NUMERIC(18, 4) NOT NULL,
    cash_low NUMERIC(18, 4) NOT NULL,
    cash_close NUMERIC(18, 4) NOT NULL,

    session_open NUMERIC(18, 4) NOT NULL,
    session_high NUMERIC(18, 4) NOT NULL,
    session_low NUMERIC(18, 4) NOT NULL,
    minutes_since_open SMALLINT NOT NULL CHECK (minutes_since_open >= 0),
    opening_range_15_high NUMERIC(18, 4),
    opening_range_15_low NUMERIC(18, 4),
    opening_range_30_high NUMERIC(18, 4),
    opening_range_30_low NUMERIC(18, 4),

    session_vwap NUMERIC(18, 4),
    vwap_sigma NUMERIC(18, 4),
    vwap_upper_1 NUMERIC(18, 4),
    vwap_lower_1 NUMERIC(18, 4),
    vwap_upper_2 NUMERIC(18, 4),
    vwap_lower_2 NUMERIC(18, 4),
    vwap_distance_sigma NUMERIC(12, 6),

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
    futures_basis_pct NUMERIC(12, 6),
    oi_change_1m BIGINT,
    oi_change_5m BIGINT,
    oi_change_15m BIGINT,
    oi_change_session BIGINT,

    PRIMARY KEY (ts, feature_run_id, instrument_id),
    CHECK (cash_high >= cash_low),
    CHECK (cash_high >= cash_open AND cash_high >= cash_close),
    CHECK (cash_low <= cash_open AND cash_low <= cash_close),
    CHECK (session_high >= session_low),
    CHECK (session_high >= session_open),
    CHECK (session_low <= session_open)
);

SELECT create_hypertable('market.intraday_features_1m', 'ts', if_not_exists => TRUE);

CREATE INDEX idx_intraday_features_instrument_ts
    ON market.intraday_features_1m (instrument_id, ts DESC);
CREATE INDEX idx_intraday_features_run_instrument_ts
    ON market.intraday_features_1m (feature_run_id, instrument_id, ts DESC);
