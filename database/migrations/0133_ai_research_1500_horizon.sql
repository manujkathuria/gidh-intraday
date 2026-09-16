-- AI-owned entry timing labels: Add 15:00 execution-intended outcome horizon.
-- Preserves 15:10 (fwd_ret_session) as neutral market outcome, adding fwd_ret_1500 as execution team horizon.

ALTER TABLE ai_research.entry_labels
    ADD COLUMN IF NOT EXISTS fwd_ret_1500 NUMERIC(10, 4);
