-- Preserve source anomalies without allowing malformed market data into raw candles.

ALTER TABLE market.cash_candles_1m
    ADD CONSTRAINT cash_candles_1m_positive_prices CHECK (open > 0 AND high > 0 AND low > 0 AND close > 0);
ALTER TABLE market.future_candles_1m
    ADD CONSTRAINT future_candles_1m_positive_prices CHECK (open > 0 AND high > 0 AND low > 0 AND close > 0);
ALTER TABLE market.cash_candles_1d
    ADD CONSTRAINT cash_candles_1d_positive_prices CHECK (open > 0 AND high > 0 AND low > 0 AND close > 0);
ALTER TABLE market.future_candles_1d
    ADD CONSTRAINT future_candles_1d_positive_prices CHECK (open > 0 AND high > 0 AND low > 0 AND close > 0);

CREATE TABLE IF NOT EXISTS market.rejected_candles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_table TEXT NOT NULL,
    owner_id BIGINT NOT NULL,
    ts TIMESTAMPTZ NOT NULL,
    open NUMERIC(18, 4) NOT NULL,
    high NUMERIC(18, 4) NOT NULL,
    low NUMERIC(18, 4) NOT NULL,
    close NUMERIC(18, 4) NOT NULL,
    volume BIGINT NOT NULL,
    open_interest BIGINT,
    rejection_reason TEXT NOT NULL,
    rejected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_table, owner_id, ts, rejection_reason)
);
