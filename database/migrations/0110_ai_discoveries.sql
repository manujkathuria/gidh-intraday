-- AI-owned, cross-session research rules. Daily research runs remain the
-- immutable record; discoveries are their traceable, evolving synthesis.

CREATE TABLE ai.discoveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scope TEXT NOT NULL,
    rule TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('CANDIDATE', 'ACTIVE', 'RETIRED')),
    confidence NUMERIC(5, 4) NOT NULL DEFAULT 0
        CHECK (confidence >= 0 AND confidence <= 1),
    sample_size INTEGER NOT NULL DEFAULT 0 CHECK (sample_size >= 0),
    created_from_research_run_id UUID REFERENCES ai.research_runs(id),
    promoted_at TIMESTAMPTZ,
    retired_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        (status = 'ACTIVE' AND promoted_at IS NOT NULL)
        OR (status <> 'ACTIVE')
    ),
    CHECK (
        (status = 'RETIRED' AND retired_at IS NOT NULL)
        OR (status <> 'RETIRED')
    )
);

CREATE INDEX idx_ai_discoveries_scope_status
    ON ai.discoveries (scope, status, confidence DESC, updated_at DESC);

CREATE TABLE ai.discovery_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discovery_id UUID NOT NULL REFERENCES ai.discoveries(id),
    research_run_id UUID NOT NULL REFERENCES ai.research_runs(id),
    stance TEXT NOT NULL CHECK (stance IN ('SUPPORTS', 'CONTRADICTS')),
    summary TEXT NOT NULL,
    evidence JSONB NOT NULL DEFAULT '{}'::JSONB,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (discovery_id, research_run_id)
);

CREATE INDEX idx_ai_discovery_evidence_discovery
    ON ai.discovery_evidence (discovery_id, recorded_at);

CREATE INDEX idx_ai_discovery_evidence_research_run
    ON ai.discovery_evidence (research_run_id);
