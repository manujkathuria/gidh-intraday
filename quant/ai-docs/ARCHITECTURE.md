# 🦅 GIDH QUANT SYSTEM: AGENT & BRAIN ARCHITECTURE

> **Mandatory Context for AI Agents & Quant Developers**: This document outlines the fundamental operating protocol, multi-brain hierarchy, and universal database schema for the GIDH quantitative trading engine.

---

## 1. Core Operating Philosophy

1. **AI is the Brain; Python Tools are the Sensory Body**:
   - Python tools (`sensors.py`, `market_macro_sensor.py`, `review_tool.py`) extract pure, high-dimensional measurements from TimescaleDB (Universe breadth, sector capital rotation waves, futures OI/capital inflows, CPR width, ADR range fuel, 1-minute order flow).
   - Python tools **DO NOT** contain hardcoded `if/else` heuristic trading rules.
   - **The AI Agent (You)** evaluates the raw sensory vectors, applies contextual reasoning, detects traps/exhaustion, and makes trading decisions.

2. **Top-Down 4-Layer Market Macro Protocol**:
   - **Layer 1: Broad Market Breadth & Universe Net Inflow (₹ Cr)**: Classify broad market regime.
   - **Layer 2: Sector Capital Waves**: Rank sectors by net 1D/3D institutional inflows to isolate leading accumulation vs bleeding distribution sectors.
   - **Layer 3: Alpha Stock Selection (Universe: ₹300 – ₹7,000)**: Select 2-4 high-fuel longs in leading sectors, 2-3 high-fuel shorts in lagging sectors, and blacklist 0% fuel climax traps.
   - **Layer 4: Distilled Cognitive Memory**: Store actionable bullet points (`market_regime`, `active_campaigns`, `learned_rules`, `traps_to_avoid`) in `quant.brain_memory`.

3. **Autonomous Cognitive Loop**:
   - Every brain operates on a continuous lifecycle:
     $$\text{Sensory Ingestion (Tools)} \longrightarrow \text{AI Decision Persistence} \longrightarrow \text{EOD Forensic Review \& Memory Update}$$
   - Memory is continuous: yesterday's EOD forensic learnings immediately feed into today's pre-market reasoning.

---

## 2. Directory Layout

```
quant/
├── base/                           # Core DB connections & sizing constants
│   ├── db.py                       # TimescaleDB connection pool & parameters
│   ├── models.py                   # Shared data structures
│   └── sectors.py                  # Canonical sector classification (210 active F&O instruments)
│
├── brains/                         # Autonomous Cognitive Trading Brains
│   ├── base_brain.py               # Abstract BaseBrain contract (inherited by all brains)
│   │
│   ├── macro_brain/                # 🧠 BRAIN 1: PRE-MARKET MACRO SELECTOR
│   │   ├── tools/
│   │   │   ├── market_macro_sensor.py # Tool 0: Universe Net Inflows, Breadth, & Sector Waves
│   │   │   ├── futures_sensor.py      # Tool 1: 1D/3D/5D Futures Dynamics (OI, Inflows, Price)
│   │   │   ├── structure_sensor.py    # Tool 2: Daily Structural Geometry (CPR, SMAs, Fuel)
│   │   │   └── review_tool.py         # Tool 3: EOD Ground-Truth Outcome Extractor
│   │   ├── types.py                # Typed dataclasses (MacroCandidate, MacroDecisions, MacroMemoryState)
│   │   ├── dispatcher.py           # Ingestion bridge & universal JSONB persistence
│   │   ├── runner.py               # CLI runner tool for record & review modes
│   │   └── PROMPT.md               # Lean 35-line protocol prompt for peer agents
│   │
│   └── micro_brain/                # ⚡ BRAIN 2: MICRO EXECUTION & SQUEEZE (09:16 - 10:00 AM)
│       ├── tools/
│       │   ├── opening_reaction_sensor.py # Tool 0: Opening Gap, CPR Pos, 3m RVOL
│       │   ├── vwap_pullback_sensor.py    # Tool 1: VWAP Bands, Slope, Pullback Limit
│       │   ├── orb_structure_sensor.py    # Tool 2: OR15 High/Low, Wick Rejections, Stops
│       │   ├── fuel_and_oi_sensor.py      # Tool 3: ADR Fuel, Targets, 15m OI Delta
│       │   └── micro_simulator.py         # Tool 4: Intraday Trade Outcome Simulator
│       ├── types.py                # Typed dataclasses (MicroSensoryPacket, MicroTradeDecisions)
│       ├── dispatcher.py           # Ingestion bridge & universal JSONB persistence
│       ├── runner.py               # CLI runner tool for sense, record, sim & review
│       └── PROMPT.md               # Prompt instructions for Micro Execution Brain
│
├── ai-docs/                        # Institutional Knowledge & Agent Context
│   ├── ARCHITECTURE.md             # This overarching architecture blueprint
│   ├── BRAIN_PROTOCOL.md           # The BaseBrain contract and rules for creating new brains
│   ├── BRAIN_1_MACRO_SELECTOR.md   # Deep-dive manual for Brain 1 (Macro Selector)
│   └── BRAIN_2_MICRO_EXECUTION.md  # Deep-dive manual for Brain 2 (Micro Execution)
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
    memory_state JSONB NOT NULL DEFAULT '{}'::jsonb, -- Distilled learned patterns & active campaigns
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. Canonical Agent CLI Commands

```bash
# 1. Ingest sensory packet for Brain 1 on any historical or live date:
./.venv/bin/python quant/towncenter.py macro <YYYY-MM-DD>

# 2. Check persistent rolling memory for any brain:
./.venv/bin/python quant/towncenter.py memory --brain macro_selector

# 3. Record Pre-Market Decisions directly via CLI:
./.venv/bin/python quant/brains/macro_brain/runner.py <YYYY-MM-DD> --mode record \
  --regime "REGIME_LABEL" \
  --leader "LEADING_SECTOR" \
  --lagger "LAGGING_SECTOR" \
  --bulls SYMBOL1 SYMBOL2 \
  --bears SYMBOL3 SYMBOL4 \
  --traps TRAP1 TRAP2 \
  --thesis "Cognitive thesis narrative..."

# 4. Review Post-Market EOD Outcomes against ground truth:
./.venv/bin/python quant/brains/macro_brain/runner.py <PRIOR_DATE> --mode review --outcome-date <OUTCOME_DATE> --forensics "Key learnings..."
```
