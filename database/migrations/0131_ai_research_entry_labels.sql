-- AI-owned entry timing labels (09:15-10:00 observation window)
-- Minute-level forward outcomes and excursions for AI entry research.

-- 1. Update session_labels primary key to include calculation_version for explicit versioning
ALTER TABLE ai_research.session_labels
    DROP CONSTRAINT session_labels_pkey,
    ADD PRIMARY KEY (session_date, instrument_id, calculation_version);

-- 2. Create entry_labels table
CREATE TABLE IF NOT EXISTS ai_research.entry_labels (
    session_date DATE NOT NULL,
    instrument_id BIGINT NOT NULL REFERENCES market.instruments(id),
    as_of_ts TIMESTAMPTZ NOT NULL,
    feature_run_id UUID NOT NULL REFERENCES market.feature_runs(id),
    as_of_price NUMERIC(18, 4) NOT NULL,
    fwd_ret_5m NUMERIC(10, 4),
    fwd_ret_15m NUMERIC(10, 4),
    fwd_ret_30m NUMERIC(10, 4),
    fwd_ret_session NUMERIC(10, 4) NOT NULL,
    fwd_path_high NUMERIC(18, 4) NOT NULL,
    fwd_path_low NUMERIC(18, 4) NOT NULL,
    fwd_max_upside_pct NUMERIC(10, 4) NOT NULL,
    fwd_max_downside_pct NUMERIC(10, 4) NOT NULL,
    calculation_version TEXT NOT NULL,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (session_date, instrument_id, as_of_ts, calculation_version)
);

CREATE INDEX IF NOT EXISTS idx_entry_labels_session_asof
    ON ai_research.entry_labels (session_date, as_of_ts);

CREATE INDEX IF NOT EXISTS idx_entry_labels_instrument_ts
    ON ai_research.entry_labels (instrument_id, as_of_ts DESC);

CREATE INDEX IF NOT EXISTS idx_entry_labels_feature_run
    ON ai_research.entry_labels (feature_run_id);
