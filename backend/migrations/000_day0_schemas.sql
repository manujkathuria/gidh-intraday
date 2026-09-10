-- Day 0 clean ownership boundary for the unreleased Gidh rebuild.
-- Legacy public tables remain untouched until the new system is ready.

CREATE SCHEMA IF NOT EXISTS market;
CREATE SCHEMA IF NOT EXISTS execution;
CREATE SCHEMA IF NOT EXISTS ai;

COMMENT ON SCHEMA market IS 'Backend-owned market data, deterministic features, and integrity records.';
COMMENT ON SCHEMA execution IS 'Backend-owned broker orders, fills, positions, and reconciliation records.';
COMMENT ON SCHEMA ai IS 'AI-owned focus lists, decisions, evidence, policies, and evaluations.';
