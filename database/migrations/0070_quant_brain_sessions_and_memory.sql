-- 0070_quant_brain_sessions_and_memory.sql
-- Universal JSONB Schema for Gidh Quant AI Brains (Macro, Micro, Risk) and Cognitive Memory

CREATE SCHEMA IF NOT EXISTS quant;

CREATE TABLE IF NOT EXISTS quant.brain_sessions (
    session_date DATE NOT NULL,
    brain_id VARCHAR(64) NOT NULL,
    decisions JSONB NOT NULL DEFAULT '{}'::jsonb,
    sensory_features JSONB NOT NULL DEFAULT '{}'::jsonb,
    ai_thesis TEXT,
    outcomes JSONB DEFAULT '{}'::jsonb,
    forensics TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    PRIMARY KEY (session_date, brain_id)
);

CREATE TABLE IF NOT EXISTS quant.brain_memory (
    brain_id VARCHAR(64) PRIMARY KEY,
    memory_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quant_brain_sessions_date 
ON quant.brain_sessions (session_date DESC);
