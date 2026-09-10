-- AI-owned delivery contract for the realtime backend.  Each row is a
-- sealed, session-scoped request to subscribe to one selected instrument.

CREATE TABLE ai.live_market_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_date DATE NOT NULL,
    instrument_id BIGINT NOT NULL REFERENCES market.instruments(id),
    research_run_id UUID NOT NULL REFERENCES ai.research_runs(id),
    decision_id UUID NOT NULL REFERENCES ai.decisions(id),
    side TEXT NOT NULL CHECK (side IN ('LONG', 'SHORT')),
    priority SMALLINT NOT NULL CHECK (priority BETWEEN 1 AND 15),
    confidence NUMERIC(5, 4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    subscription_starts_at TIMESTAMPTZ NOT NULL,
    subscription_ends_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'PUBLISHED'
        CHECK (status IN ('PUBLISHED', 'CANCELLED')),
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (subscription_ends_at > subscription_starts_at),
    UNIQUE (session_date, instrument_id),
    UNIQUE (decision_id)
);

CREATE INDEX idx_ai_live_market_subscriptions_active
    ON ai.live_market_subscriptions (session_date, status, priority);
