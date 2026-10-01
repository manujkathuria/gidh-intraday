-- ==============================================================================
-- GIDH QUANT — MACRO STOCK SELECTION SCHEMA
-- Tables for scheduled RVOL + PDH/PDL + Futures Confirmation Macro Selection
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS quant;

CREATE TABLE IF NOT EXISTS quant.macro_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_date DATE NOT NULL,
    snapshot_time TIME NOT NULL,
    total_scanned INT NOT NULL DEFAULT 0,
    shorts_count INT NOT NULL DEFAULT 0,
    longs_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_macro_runs_date_time UNIQUE (session_date, snapshot_time)
);

CREATE INDEX IF NOT EXISTS idx_macro_runs_date ON quant.macro_runs(session_date DESC);

CREATE TABLE IF NOT EXISTS quant.macro_selections (
    id BIGSERIAL PRIMARY KEY,
    macro_run_id UUID NOT NULL REFERENCES quant.macro_runs(id) ON DELETE CASCADE,
    instrument_id BIGINT NOT NULL REFERENCES market.instruments(id) ON DELETE CASCADE,
    symbol VARCHAR(32) NOT NULL,
    sector VARCHAR(64),
    side VARCHAR(10) NOT NULL,            -- 'SHORT' or 'LONG'
    setup_type VARCHAR(32) NOT NULL,      -- 'PDL_BREAKDOWN', 'PDH_BREAKOUT'
    rvol NUMERIC(8,2) NOT NULL,
    price NUMERIC(12,4) NOT NULL,
    vwap NUMERIC(12,4) NOT NULL,
    sigma NUMERIC(12,4) NOT NULL,
    vwap_plus_1s NUMERIC(12,4) NOT NULL,
    vwap_plus_2s NUMERIC(12,4) NOT NULL,
    vwap_minus_1s NUMERIC(12,4) NOT NULL,
    vwap_minus_2s NUMERIC(12,4) NOT NULL,
    pdh NUMERIC(12,4) NOT NULL,
    pdl NUMERIC(12,4) NOT NULL,
    prior_close NUMERIC(12,4) NOT NULL,
    day_change_pct NUMERIC(8,2) NOT NULL DEFAULT 0,
    vwap_dist_pct NUMERIC(8,2) NOT NULL DEFAULT 0,
    clv NUMERIC(8,4) NOT NULL DEFAULT 0,
    future_close NUMERIC(12,4),
    futures_basis NUMERIC(12,4),
    futures_basis_pct NUMERIC(8,2),
    oi_change_session BIGINT,
    oi_structure VARCHAR(32),             -- 'SHORT_BUILDUP', 'LONG_UNWINDING', 'LONG_BUILDUP', 'SHORT_COVERING', 'NO_FUTURES'
    rank INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_macro_selection_run_instrument UNIQUE (macro_run_id, instrument_id)
);

CREATE INDEX IF NOT EXISTS idx_macro_selections_run ON quant.macro_selections(macro_run_id, side, rank);
CREATE INDEX IF NOT EXISTS idx_macro_selections_symbol ON quant.macro_selections(symbol);
