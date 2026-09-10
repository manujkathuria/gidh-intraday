-- Daily raw candles provide the long lookback required by reproducible features.

CREATE TABLE IF NOT EXISTS market.cash_candles_1d (
    session_date DATE NOT NULL,
    instrument_id BIGINT NOT NULL REFERENCES market.instruments(id),
    open NUMERIC(18, 4) NOT NULL,
    high NUMERIC(18, 4) NOT NULL,
    low NUMERIC(18, 4) NOT NULL,
    close NUMERIC(18, 4) NOT NULL,
    volume BIGINT NOT NULL CHECK (volume >= 0),
    source_ts TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (session_date, instrument_id),
    CHECK (high >= low),
    CHECK (high >= open AND high >= close),
    CHECK (low <= open AND low <= close)
);

CREATE INDEX IF NOT EXISTS idx_cash_daily_instrument_date
    ON market.cash_candles_1d (instrument_id, session_date DESC);

CREATE TABLE IF NOT EXISTS market.future_candles_1d (
    session_date DATE NOT NULL,
    future_contract_id BIGINT NOT NULL REFERENCES market.future_contracts(id),
    open NUMERIC(18, 4) NOT NULL,
    high NUMERIC(18, 4) NOT NULL,
    low NUMERIC(18, 4) NOT NULL,
    close NUMERIC(18, 4) NOT NULL,
    volume BIGINT NOT NULL CHECK (volume >= 0),
    open_interest BIGINT NOT NULL CHECK (open_interest >= 0),
    source_ts TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (session_date, future_contract_id),
    CHECK (high >= low),
    CHECK (high >= open AND high >= close),
    CHECK (low <= open AND low <= close)
);

CREATE INDEX IF NOT EXISTS idx_future_daily_contract_date
    ON market.future_candles_1d (future_contract_id, session_date DESC);
