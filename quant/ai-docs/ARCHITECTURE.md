# 🦅 GIDH QUANT SYSTEM: AGENT & BRAIN ARCHITECTURE

> **Mandatory Context for AI Agents & Quant Developers**: This document outlines the fundamental operating protocol, multi-brain hierarchy, and universal database schema for the GIDH quantitative trading engine.

---

## 1. Core Operating Philosophy

1. **AI is the Brain; Python Tools are the Sensory Body**:
   - Python tools (`sensors.py`, `review_sensor.py`) extract pure, unadulterated high-dimensional measurements from TimescaleDB (Futures OI, capital inflows, CPR geometry, range fuel, 1-minute order flow).
   - Python tools **DO NOT** contain hardcoded `if/else` heuristic trading rules.
   - **The AI Agent (You)** evaluates the raw sensory vectors, applies contextual reasoning, detects traps/exhaustion, and makes trading decisions.

2. **Autonomous Cognitive Loop**:
   - Every brain operates on a 3-stage continuous lifecycle:
     $$\text{Sensory Ingestion (Tools)} \longrightarrow \text{AI Decision Persistence} \longrightarrow \text{EOD Forensic Review \& Memory Update}$$
   - Memory is continuous: yesterday's EOD forensic learnings immediately feed into today's pre-market reasoning.

---

## 2. Directory Layout

```
quant/
├── base/                           # Core DB connections & sizing constants
│   ├── db.py                       # TimescaleDB connection pool & parameters
│   └── models.py                   # Shared data structures
│
├── brains/                         # Autonomous Cognitive Trading Brains
│   ├── base_brain.py               # Abstract BaseBrain contract (inherited by all brains)
│   │
│   ├── macro_brain/                # 🧠 BRAIN 1: PRE-MARKET MACRO SELECTOR
│   │   ├── tools/
│   │   │   ├── futures_sensor.py   # Tool 1: 1D/3D/5D Futures Dynamics (OI, Inflows, Price)
│   │   │   ├── structure_sensor.py # Tool 2: Daily Structural Geometry (CPR, SMAs, Fuel)
│   │   │   └── review_tool.py      # Tool 3: EOD Ground-Truth Outcome Extractor
│   │   └── dispatcher.py           # Ingestion bridge & universal JSONB persistence
│   │
│   └── micro_brains/               # ⚡ MICRO BRAINS: INTRADAY LIVE EXECUTION (09:15 - 15:30)
│       └── ...                     # (VWAP Rejection, ORB Breakout, Pullback Defense)
│
├── ai-docs/                        # Institutional Knowledge & Agent Context
│   ├── ARCHITECTURE.md             # This overarching architecture blueprint
│   ├── BRAIN_PROTOCOL.md           # The BaseBrain contract and rules for creating new brains
│   └── BRAIN_1_MACRO_SELECTOR.md   # Deep-dive manual for Brain 1 (Macro Selector)
│
└── towncenter.py                   # Master CLI Cockpit Interface
```

---

## 3. Universal 2-Table JSONB Database Schema

All brains write and read from **2 universal tables** in PostgreSQL (`quant` schema) without requiring schema migrations:

### Table 1: `quant.brain_sessions` (Session Decisions & Outcomes)
```sql
CREATE TABLE IF NOT EXISTS quant.brain_sessions (
    session_date DATE NOT NULL,
    brain_id VARCHAR(64) NOT NULL,          -- 'macro_selector', 'micro_vwap', 'micro_orb', etc.
    decisions JSONB NOT NULL DEFAULT '{}'::jsonb, 
    sensory_features JSONB NOT NULL DEFAULT '{}'::jsonb,
    ai_thesis TEXT,
    outcomes JSONB DEFAULT '{}'::jsonb,
    forensics TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    PRIMARY KEY (session_date, brain_id)
);
```

### Table 2: `quant.brain_memory` (Persistent Multi-Day Rolling Memory)
```sql
CREATE TABLE IF NOT EXISTS quant.brain_memory (
    brain_id VARCHAR(64) PRIMARY KEY,       -- e.g. 'macro_selector'
    memory_state JSONB NOT NULL DEFAULT '{}'::jsonb, -- Rolling learned patterns & active campaigns
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. Master CLI Commands

```bash
# Ingest sensory packet for Brain 1 on any historical or live date:
.venv/bin/python3 -m quant.towncenter macro 2026-09-08

# Check persistent rolling memory for any brain:
.venv/bin/python3 -m quant.towncenter memory --brain macro_selector
```
