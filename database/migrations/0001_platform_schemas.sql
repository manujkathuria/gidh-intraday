-- Shared database ownership boundary. This migration is the foundation for a
-- fresh database and must run before every schema-specific migration.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE SCHEMA IF NOT EXISTS market;
CREATE SCHEMA IF NOT EXISTS execution;
CREATE SCHEMA IF NOT EXISTS ai;

COMMENT ON SCHEMA market IS 'Backend-owned market data, deterministic features, and integrity records.';
COMMENT ON SCHEMA execution IS 'Backend-owned broker orders, fills, positions, and reconciliation records.';
COMMENT ON SCHEMA ai IS 'AI-owned focus lists, decisions, evidence, policies, and evaluations.';
