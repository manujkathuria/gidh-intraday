-- AI-owned durable research records. Market facts remain referenced, never copied.

CREATE TABLE ai.research_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_date DATE NOT NULL,
    feature_run_id UUID NOT NULL REFERENCES market.feature_runs(id),
    policy_version TEXT NOT NULL,
    model_version TEXT,
    status TEXT NOT NULL CHECK (status IN ('RUNNING', 'SUCCEEDED', 'FAILED')),
    input_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    error_message TEXT
);

CREATE INDEX idx_ai_research_runs_session ON ai.research_runs (session_date DESC, started_at DESC);

CREATE TABLE ai.daily_focus_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    research_run_id UUID NOT NULL UNIQUE REFERENCES ai.research_runs(id),
    session_date DATE NOT NULL,
    feature_run_id UUID NOT NULL REFERENCES market.feature_runs(id),
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'PUBLISHED', 'SUPERSEDED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

CREATE TABLE ai.daily_focus_list_items (
    focus_list_id UUID NOT NULL REFERENCES ai.daily_focus_lists(id) ON DELETE CASCADE,
    instrument_id BIGINT NOT NULL REFERENCES market.instruments(id),
    rank SMALLINT NOT NULL CHECK (rank > 0),
    state TEXT NOT NULL CHECK (state IN ('WATCH')),
    attention_score NUMERIC(12, 6) NOT NULL,
    rationale JSONB NOT NULL,
    PRIMARY KEY (focus_list_id, instrument_id),
    UNIQUE (focus_list_id, rank)
);

CREATE TABLE ai.observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    research_run_id UUID NOT NULL REFERENCES ai.research_runs(id),
    instrument_id BIGINT REFERENCES market.instruments(id),
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    category TEXT NOT NULL,
    summary TEXT NOT NULL,
    evidence JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE TABLE ai.decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    research_run_id UUID NOT NULL REFERENCES ai.research_runs(id),
    prior_decision_id UUID REFERENCES ai.decisions(id),
    instrument_id BIGINT NOT NULL REFERENCES market.instruments(id),
    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    state TEXT NOT NULL CHECK (state IN ('WATCH', 'NO_TRADE', 'LONG', 'SHORT', 'WITHDRAWN')),
    confidence NUMERIC(5, 4),
    thesis TEXT NOT NULL,
    invalidation TEXT NOT NULL,
    human_status TEXT NOT NULL CHECK (human_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    details JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX idx_ai_decisions_instrument_time ON ai.decisions (instrument_id, decided_at DESC);

CREATE TABLE ai.journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    decision_id UUID REFERENCES ai.decisions(id),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    outcome_notes TEXT NOT NULL,
    outcome JSONB NOT NULL DEFAULT '{}'::JSONB
);
