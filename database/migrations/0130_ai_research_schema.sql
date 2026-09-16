-- AI-owned historical research layer.
-- Immutable ground-truth session labels, durable experiments, and append-only evidence.

CREATE SCHEMA IF NOT EXISTS ai_research;
COMMENT ON SCHEMA ai_research IS 'AI-owned historical labels, experiments, and evidence.';

-- Neutral historical session labels per instrument per completed trade session (09:30 to 15:10).
CREATE TABLE IF NOT EXISTS ai_research.session_labels (
    session_date DATE NOT NULL,
    instrument_id BIGINT NOT NULL REFERENCES market.instruments(id),
    feature_run_id UUID NOT NULL REFERENCES market.feature_runs(id),
    reference_ts TIMESTAMPTZ NOT NULL,
    reference_close NUMERIC(18, 4) NOT NULL,
    session_end_ts TIMESTAMPTZ NOT NULL,
    session_end_close NUMERIC(18, 4) NOT NULL,
    return_pct NUMERIC(10, 4) NOT NULL,
    absolute_return_pct NUMERIC(10, 4) NOT NULL,
    path_high NUMERIC(18, 4) NOT NULL,
    path_low NUMERIC(18, 4) NOT NULL,
    upside_excursion_pct NUMERIC(10, 4) NOT NULL,
    downside_excursion_pct NUMERIC(10, 4) NOT NULL,
    gainer_rank SMALLINT NOT NULL CHECK (gainer_rank >= 1),
    loser_rank SMALLINT NOT NULL CHECK (loser_rank >= 1),
    is_top_5_gainer BOOLEAN NOT NULL DEFAULT FALSE,
    is_top_10_gainer BOOLEAN NOT NULL DEFAULT FALSE,
    is_top_20_gainer BOOLEAN NOT NULL DEFAULT FALSE,
    is_top_5_loser BOOLEAN NOT NULL DEFAULT FALSE,
    is_top_10_loser BOOLEAN NOT NULL DEFAULT FALSE,
    is_top_20_loser BOOLEAN NOT NULL DEFAULT FALSE,
    calculation_version TEXT NOT NULL,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (session_date, instrument_id)
);

CREATE INDEX IF NOT EXISTS idx_session_labels_feature_run
    ON ai_research.session_labels (feature_run_id);

CREATE INDEX IF NOT EXISTS idx_session_labels_date_gainers
    ON ai_research.session_labels (session_date, gainer_rank);

CREATE INDEX IF NOT EXISTS idx_session_labels_date_losers
    ON ai_research.session_labels (session_date, loser_rank);

CREATE INDEX IF NOT EXISTS idx_session_labels_instrument_date
    ON ai_research.session_labels (instrument_id, session_date DESC);

-- Durable records for questions investigated by AI research.
CREATE TABLE IF NOT EXISTS ai_research.experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    hypothesis TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'RUNNING', 'SUCCEEDED', 'FAILED')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    point_in_time_contract JSONB NOT NULL DEFAULT '{}'::JSONB,
    calculation_version TEXT NOT NULL,
    policy_version TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::JSONB,
    summary JSONB NOT NULL DEFAULT '{}'::JSONB,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_experiments_status
    ON ai_research.experiments (status, started_at DESC);

-- Append-only evidence produced by an experiment.
CREATE TABLE IF NOT EXISTS ai_research.experiment_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID NOT NULL REFERENCES ai_research.experiments(id) ON DELETE CASCADE,
    session_date DATE,
    instrument_id BIGINT REFERENCES market.instruments(id),
    kind TEXT NOT NULL CHECK (kind IN ('SUMMARY', 'SUPPORT', 'CONTRADICTION', 'COUNTEREXAMPLE')),
    sample_size INTEGER NOT NULL DEFAULT 0 CHECK (sample_size >= 0),
    direction_hit_rate NUMERIC(6, 4),
    top_5_capture_rate NUMERIC(6, 4),
    top_10_capture_rate NUMERIC(6, 4),
    top_20_capture_rate NUMERIC(6, 4),
    summary TEXT NOT NULL,
    evidence JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_experiment_evidence_experiment_kind
    ON ai_research.experiment_evidence (experiment_id, kind);

CREATE INDEX IF NOT EXISTS idx_ai_experiment_evidence_experiment_date
    ON ai_research.experiment_evidence (experiment_id, session_date);
