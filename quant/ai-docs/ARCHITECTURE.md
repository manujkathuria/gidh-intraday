# Quant Trading System: Onboarding & Architecture Blueprint

Welcome to the **Gidh Quant Trading System**. This repository houses the complete quantitative strategy development, daily replay evaluation, real-time war room execution, and TimescaleDB business intelligence (BI) engine.

---

## 1. System Overview & Core Philosophy

Our quant philosophy is rooted in **intraday volume conviction, disciplined checkpoint execution, and risk symmetry**:
- **No Tick-Watching**: Decisions are evaluated strictly at predefined 15-minute checkpoints (`09:30`, `09:45`, `10:45`, `11:30`, `12:30`, `14:30`, `15:15/15:29`).
- **Idiosyncratic Institutional Flow**: We hunt stocks with high Relative Volume (RVOL) and clean Close Location Value (CLV) that operate independently or in synchronized sector battalions.
- **Strict Capital & Risk Boundaries**:
  - Base account pool: ₹50,000 INR (utilizing 5x MIS margin for ₹2,50,000 gross exposure).
  - Allocation: Max 5 concurrent trades @ ₹10,000 margin / ₹50,000 position value per trade.
  - Max single trade loss limit: ~₹300 - ₹400 INR (-0.6% to -0.8%).
  - Hard daily portfolio loss circuit: -₹1,500 INR (-3.0%).
- **The 11:30 Split-Exit Rule**: Any trade that loses VWAP at 11:30 on low/fading volume conviction (Tier 3) is immediately cut to preserve capital.

---

## 2. Directory Layout

```text
quant/
├── ai-docs/                     # Architecture blueprints, agent handoffs, protocols & guidelines
│   ├── ARCHITECTURE.md          # Complete system architecture and execution workflows
│   ├── STRATEGY_PLAYBOOK.md     # Tactics, volume tiering, entry/exit criteria & filters
│   └── DATABASE_SCHEMA.md       # TimescaleDB quant.* tables, views, and analytics queries
├── tools/                       # Operational micro-tools for screening, tracking, and sync
│   ├── decision_screen.py       # 09:30 & 09:45 Long/Short screeners
│   ├── battalion_scanner.py     # Sector battalion cohesion and leader/follower detection
│   ├── trade_tracker.py         # Multi-checkpoint trajectory evaluator
│   ├── session_breadth.py       # Market-wide breadth and top movers
│   └── db_sync.py               # Markdown memory card to TimescaleDB synchronizer
├── memory/                      # Markdown daily memory cards (Day 004 to Day 026+)
│   ├── day_010_2026-07-24.md
│   └── ...
├── live/                        # Live trading session cards and execution logs
├── DB_MEMORY_MANAGEMENT.md      # Dual-memory design specification (Markdown + Postgres)
├── PAIR_PROGRAMMING_PROTOCOL.md # War room collaboration protocol
└── ANTIGRAVITY_HANDOFF.md       # Agent state handoff and operational directives
```

---

## 3. The 3 Core Tactics

### A. `TACTIC_PALADIN_RUSH` (Idiosyncratic Long Momentum)
- **Signal**: Stock opens strong, trades above VWAP at 09:30, high RVOL (≥ 2.5x), and positive opening return.
- **Entry**: 09:30 / 09:45 close.
- **Invalidation**: 15m close below VWAP at 11:30 or hard stop-loss trigger.

### B. `TACTIC_ZERO_CLV_SHORT` (Institutional Distribution / Breakdown)
- **Signal**: Stock opens weak, stays below VWAP at 09:30, high RVOL (≥ 2.5x), low CLV (≤ 0.20), negative open-to-close return.
- **Entry**: 09:30 / 09:45 close.
- **Invalidation**: 15m close above VWAP or hard stop-loss trigger.

### C. `TACTIC_INDUSTRIAL_SIEGE` (Battalion Cohesion)
- **Signal**: Synchronized 2+ sibling stocks firing in the same sector (e.g., Healthcare, Defense, Capital Goods).
- **Execution**: Trade the designated Leader with highest RVOL or the clean Follower upon confirmation.

---

## 4. Volume Conviction Tiers

- **Tier 1 (RVOL ≥ 15x)**: Extreme institutional commitment (`ASTRAL`, `PAGEIND`, `VOLTAS`). High insulation against midday chop; hold for multi-hour trend extension.
- **Tier 2 (RVOL 5x–15x)**: Strong institutional interest (`APOLLOHOSP`, `BDL`, `JIOFIN`).
- **Tier 3 (RVOL 2x–5x)**: Moderate momentum. **Strictly requires the 11:30 split-exit if VWAP is lost**.

---

## 5. TimescaleDB Database Integration (`quant.*`)

The quant system maintains dual memory: human-readable Markdown cards and relational tables in the local PostgreSQL/TimescaleDB container (`gidh_intraday`):
- `quant.sessions`: Daily market session metadata, breadth metrics, and summary lessons.
- `quant.trades`: Granular per-trade ledger with entry/exit prices, invalidation rules, INR P&L, percentage returns, and tactic labels.
- `quant.checkpoints`: 15-minute mark-to-market prices and trajectory metrics.
- `quant.lessons`: Quant observations and rule updates.
