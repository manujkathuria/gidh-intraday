-- AI-owned entry timing labels with explicit decision-time semantics.
-- Distinguishes bar_start_ts (candle start) from decision_ts (candle close / decision time).
-- Non-destructive schema evolution preserving all calculation versions.

CREATE TABLE IF NOT EXISTS ai_research.entry_labels (
    session_date DATE NOT NULL,
    instrument_id BIGINT NOT NULL REFERENCES market.instruments(id),
    bar_start_ts TIMESTAMPTZ NOT NULL,
    decision_ts TIMESTAMPTZ NOT NULL,
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
    PRIMARY KEY (session_date, instrument_id, bar_start_ts, calculation_version)
);

CREATE INDEX IF NOT EXISTS idx_entry_labels_session_decision
    ON ai_research.entry_labels (session_date, decision_ts);

CREATE INDEX IF NOT EXISTS idx_entry_labels_session_bar
    ON ai_research.entry_labels (session_date, bar_start_ts);

CREATE INDEX IF NOT EXISTS idx_entry_labels_instrument_decision
    ON ai_research.entry_labels (instrument_id, decision_ts DESC);

CREATE INDEX IF NOT EXISTS idx_entry_labels_feature_run
    ON ai_research.entry_labels (feature_run_id);
