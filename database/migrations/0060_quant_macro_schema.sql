-- 0060_quant_macro_schema.sql
-- Step 1 Institutional Macro Futures Inflow & Fuel Picks Table

CREATE SCHEMA IF NOT EXISTS quant;
COMMENT ON SCHEMA quant IS 'Quant-owned models, macro screening picks, campaign states, and trade forensics.';

CREATE TABLE IF NOT EXISTS quant.macro_daily_picks (
    id BIGSERIAL PRIMARY KEY,
    session_date DATE NOT NULL,
    rank INT NOT NULL,
    symbol VARCHAR(32) NOT NULL,
    stance VARCHAR(24) NOT NULL,            -- 'LONG BUILDUP', 'SHORT ATTACK', 'SHORT SQUEEZE'
    fut_close NUMERIC(12, 2) NOT NULL,
    price_1d_pct NUMERIC(8, 2) NOT NULL,
    oi_1d_pct NUMERIC(8, 2) NOT NULL,
    fresh_inflow_1d_cr NUMERIC(12, 2) NOT NULL,
    fresh_inflow_3d_cr NUMERIC(12, 2) NOT NULL,
    total_notional_cr NUMERIC(14, 2) NOT NULL,
    adr_10d NUMERIC(12, 2) NOT NULL,
    macro_fuel_pct NUMERIC(6, 2) NOT NULL,
    conviction_score NUMERIC(8, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_date, symbol)
);

CREATE INDEX IF NOT EXISTS idx_quant_macro_date 
ON quant.macro_daily_picks (session_date, rank);
