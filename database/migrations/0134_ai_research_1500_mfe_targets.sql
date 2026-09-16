-- AI-owned entry timing labels: Add 15:00-capped directional MFE/MAE and 1.5% target hit labels.
-- Non-destructive schema evolution.

ALTER TABLE ai_research.entry_labels
    ADD COLUMN IF NOT EXISTS fwd_path_high_1500 NUMERIC(18, 4),
    ADD COLUMN IF NOT EXISTS fwd_path_low_1500 NUMERIC(18, 4),
    ADD COLUMN IF NOT EXISTS long_mfe_pct NUMERIC(10, 4),
    ADD COLUMN IF NOT EXISTS long_mae_pct NUMERIC(10, 4),
    ADD COLUMN IF NOT EXISTS short_mfe_pct NUMERIC(10, 4),
    ADD COLUMN IF NOT EXISTS short_mae_pct NUMERIC(10, 4),
    ADD COLUMN IF NOT EXISTS long_hit_150bp BOOLEAN,
    ADD COLUMN IF NOT EXISTS short_hit_150bp BOOLEAN;
