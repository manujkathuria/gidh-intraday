-- Migration 0090: Create Market Structural Rejection & Liquidity Context Materialized View
-- Purpose: Precompute multi-day rejection zones (PDH/PDL, 3D/5D/20D highs/lows),
--          compression patterns (NR4, NR7, Inside Days), and structural context
--          for all instruments across every trading session.

CREATE MATERIALIZED VIEW IF NOT EXISTS market.mv_daily_structural_context AS
WITH daily_data AS (
    SELECT 
        c.instrument_id,
        c.session_date,
        c.open,
        c.high,
        c.low,
        c.close,
        c.volume,
        c.high - c.low as daily_range,
        LAG(c.high, 1) OVER w as pdh,
        LAG(c.low, 1) OVER w as pdl,
        LAG(c.close, 1) OVER w as pdc,
        LAG(c.open, 1) OVER w as pdo,
        LAG(c.volume, 1) OVER w as pdv,
        LAG(c.high - c.low, 1) OVER w as pd_range,
        
        -- Multi-day historical rejection and support levels (prior to current day)
        MAX(c.high) OVER (PARTITION BY c.instrument_id ORDER BY c.session_date ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING) as high_3d,
        MIN(c.low)  OVER (PARTITION BY c.instrument_id ORDER BY c.session_date ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING) as low_3d,
        MAX(c.high) OVER (PARTITION BY c.instrument_id ORDER BY c.session_date ROWS BETWEEN 5 PRECEDING AND 1 PRECEDING) as high_5d,
        MIN(c.low)  OVER (PARTITION BY c.instrument_id ORDER BY c.session_date ROWS BETWEEN 5 PRECEDING AND 1 PRECEDING) as low_5d,
        MAX(c.high) OVER (PARTITION BY c.instrument_id ORDER BY c.session_date ROWS BETWEEN 20 PRECEDING AND 1 PRECEDING) as high_20d,
        MIN(c.low)  OVER (PARTITION BY c.instrument_id ORDER BY c.session_date ROWS BETWEEN 20 PRECEDING AND 1 PRECEDING) as low_20d,
        
        -- Rolling range minima for NR4 and NR7 detection (prior to current day)
        MIN(c.high - c.low) OVER (PARTITION BY c.instrument_id ORDER BY c.session_date ROWS BETWEEN 4 PRECEDING AND 1 PRECEDING) as min_range_4d,
        MIN(c.high - c.low) OVER (PARTITION BY c.instrument_id ORDER BY c.session_date ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING) as min_range_7d
    FROM market.cash_candles_1d c
    WINDOW w AS (PARTITION BY c.instrument_id ORDER BY c.session_date)
)
SELECT 
    d.instrument_id,
    i.symbol,
    i.sector,
    d.session_date,
    d.open,
    d.high,
    d.low,
    d.close,
    d.volume,
    d.pdh,
    d.pdl,
    d.pdc,
    d.high_3d,
    d.low_3d,
    d.high_5d,
    d.low_5d,
    d.high_20d,
    d.low_20d,
    
    -- Compression & Coiled Energy Patterns (based on prior day's close)
    CASE 
        WHEN d.pd_range IS NOT NULL AND d.pd_range <= d.min_range_4d THEN TRUE 
        ELSE FALSE 
    END as is_nr4,
    CASE 
        WHEN d.pd_range IS NOT NULL AND d.pd_range <= d.min_range_7d THEN TRUE 
        ELSE FALSE 
    END as is_nr7,
    CASE 
        WHEN LAG(d.high, 1) OVER (PARTITION BY d.instrument_id ORDER BY d.session_date) < LAG(d.high, 2) OVER (PARTITION BY d.instrument_id ORDER BY d.session_date)
         AND LAG(d.low, 1)  OVER (PARTITION BY d.instrument_id ORDER BY d.session_date) > LAG(d.low, 2)  OVER (PARTITION BY d.instrument_id ORDER BY d.session_date)
        THEN TRUE 
        ELSE FALSE 
    END as is_inside_day,
    
    -- Proximity to historical rejection zones (% distance from prior close to key level)
    CASE 
        WHEN d.pdc > 0 AND d.high_5d IS NOT NULL THEN ((d.high_5d - d.pdc) / d.pdc) * 100.0 
        ELSE NULL 
    END as dist_to_5d_high_pct,
    CASE 
        WHEN d.pdc > 0 AND d.low_5d IS NOT NULL THEN ((d.pdc - d.low_5d) / d.pdc) * 100.0 
        ELSE NULL 
    END as dist_to_5d_low_pct,
    CASE 
        WHEN d.pdc > 0 AND d.pdh IS NOT NULL THEN ((d.pdh - d.pdc) / d.pdc) * 100.0 
        ELSE NULL 
    END as dist_to_pdh_pct,
    CASE 
        WHEN d.pdc > 0 AND d.pdl IS NOT NULL THEN ((d.pdc - d.pdl) / d.pdc) * 100.0 
        ELSE NULL 
    END as dist_to_pdl_pct
FROM daily_data d
JOIN market.instruments i ON d.instrument_id = i.id
WHERE d.pdh IS NOT NULL;

-- Create Indexes for fast querying by session_date, instrument, and pattern
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_structural_ctx_inst_date 
    ON market.mv_daily_structural_context (instrument_id, session_date);

CREATE INDEX IF NOT EXISTS idx_mv_structural_ctx_date_sym 
    ON market.mv_daily_structural_context (session_date, symbol);

CREATE INDEX IF NOT EXISTS idx_mv_structural_ctx_patterns 
    ON market.mv_daily_structural_context (session_date, is_nr7, is_inside_day);
