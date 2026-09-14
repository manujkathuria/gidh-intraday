# Gidh Quant Trading Engine

Minimal, high-performance quantitative research, daily replay training, live war room execution, and TimescaleDB business intelligence (BI) engine.

---

## Directory Layout

```text
quant/
├── README.md            # Root orientation & quick CLI commands
├── ai-docs/             # Complete single source of truth for agents & developers
│   ├── ARCHITECTURE.md      # Core philosophy, execution model & directory layout
│   ├── STRATEGY_PLAYBOOK.md # Tactics, volume conviction tiers, entry/exit criteria & risk rules
│   └── DATABASE_SCHEMA.md   # TimescaleDB quant.* tables, views, and analytics queries
├── tools/               # Fast CLI tools (decision screens, scanners, trackers, DB sync)
│   ├── decision_screen.py   # 09:30 & 09:45 Long/Short screening
│   ├── battalion_scanner.py # Sector battalion cohesion and leader/follower detection
│   ├── trade_tracker.py     # Checkpoint trajectory evaluator (15m mark-to-market)
│   ├── session_breadth.py   # Market breadth and top gainers/losers
│   └── db_sync.py           # Markdown memory cards to TimescaleDB sync
├── memory/              # Daily replay memory cards (Day 004 to present)
└── output/              # Replay outputs & summaries
```

---

## Core CLI Commands

```bash
# 1. 09:30 Decision Screen
python3 quant/tools/decision_screen.py --day 26 --time 09:30

# 2. Battalion Scanner
python3 quant/tools/battalion_scanner.py --day 26 --time 09:30

# 3. Checkpoint Scout / Alert Radar
python3 quant/tools/scout.py --day 31 --time 11:30 --positions "MUTHOOTFIN:long:3147.2,SAIL:long:177.6,AMBER:short:7319.0"

# 4. Track Full Day Checkpoint Trajectory
python3 quant/tools/trade_tracker.py --day 31 --symbols MUTHOOTFIN SAIL AMBER

# 5. Ingest Session into TimescaleDB
python3 quant/tools/db_sync.py --day 31
```

---

## Single Sources of Truth
- **System & Checkpoint Architecture**: [quant/ai-docs/ARCHITECTURE.md](file:///Users/manujkathuria/workspace/gidh/gidh-intraday/quant/ai-docs/ARCHITECTURE.md)
- **Quant Strategies & Risk Management**: [quant/ai-docs/STRATEGY_PLAYBOOK.md](file:///Users/manujkathuria/workspace/gidh/gidh-intraday/quant/ai-docs/STRATEGY_PLAYBOOK.md)
- **TimescaleDB BI & Schemas**: [quant/ai-docs/DATABASE_SCHEMA.md](file:///Users/manujkathuria/workspace/gidh/gidh-intraday/quant/ai-docs/DATABASE_SCHEMA.md)
