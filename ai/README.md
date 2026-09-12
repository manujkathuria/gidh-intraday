# Antigravity Intraday Alpha Engine: Peer Architecture & Developer Guide

## 🎯 System Objective
This engine powers the **2v2 Co-op Intraday Alpha Platform** on 1-minute historical equity data (~210 F&O instruments in TimescaleDB `gidh_intraday`). It decouples **Morning Stock Selection (09:15-09:30 AM)** from **Execution Mechanics**, evaluating market physics organically with zero external API costs.

---

## 🏛️ Directory Architecture
```
gidh-intraday/
├── ai/                              # Antigravity Intelligence Base
│   ├── .venv/                       # Dedicated Python 3.13 virtualenv
│   ├── db.py                        # DB Connection & F&O Sector Mappings (210 symbols)
│   ├── engine.py                    # Vectorized Market Scouting & Sector Battalions
│   ├── traps.py                     # Bull/Bear Trap & Manipulation Feint Classifiers
│   ├── unbox.py                     # EOD Ground-Truth Auditing & DB Persistence
│   ├── cli.py                       # Unified CLI for agents and automation
│   ├── SELECTION_PLAYBOOK.md        # Command Codex & Match Post-Mortems
│   └── stock_selector_contract.md   # The AoE2 2v2 Co-op Build Order Contract
│
├── analysis/                        # User Sandbox Base
│   ├── .venv/                       # User dedicated virtualenv
│   └── app.py                       # Self-contained Streamlit War Room Dashboard
│
└── web/                             # Next.js 14 Web Replay App (Planned)
```

---

## ⚡ CLI Command Reference (For Agents & Scripts)

All commands are run using the dedicated virtualenv `ai/.venv`:

```bash
# 1. Scout any session at 09:30 AM (Weather, Godzilla RVOL, Sectors, and Traps)
ai/.venv/bin/python -m ai.cli scout --date 2026-07-17 --time 09:30:00

# 2. Unbox 15:15 PM EOD ground truth (MVPs, Annihilated Bases, MFEs)
ai/.venv/bin/python -m ai.cli unbox --date 2026-07-17

# 3. List available trading days in the dataset
ai/.venv/bin/python -m ai.cli days --limit 20
```

---

## 🔬 Core Market Physics & Mathematical Models

### 1. Opening Gap (%)
$$\text{Gap \%} = \frac{\text{Open}_{09:15} - \text{Close}_{15:29\text{ (prev day)}}}{\text{Close}_{15:29\text{ (prev day)}}} \times 100$$

### 2. RVOL (Relative Volume Multiplier)
$$\text{RVOL}_{09:30} = \frac{\sum_{t=09:15}^{09:30} \text{Volume}_t}{\text{Mean Volume}(09:15-09:30) \text{ over previous 20 sessions}}$$
- **Godzilla Volume**: $\text{RVOL} \ge 10.0\text{x}$ (Institutional all-in).
- **Heavy Volume**: $4.0\text{x} \le \text{RVOL} < 10.0\text{x}$.

### 3. Close Location Value (CLV)
$$\text{CLV} = \frac{\text{Price}_{09:30} - \text{Low}_{09:30}}{\text{High}_{09:30} - \text{Low}_{09:30}}$$
- $\text{CLV} \ge 0.80$: Buyers pushing into the highs (Strong continuation).
- $\text{CLV} \le 0.20$: Sellers dumping into the lows (Severe liquidation).

### 4. Trap & Manipulation Classification (`ai/traps.py`)
- **`BULL_TRAP (Gap & Crap)`**: $\text{Gap} \ge +1.2\%$ AND $\text{Price} < \text{VWAP}$ AND $\text{CLV} \le 0.25$.
- **`BEAR_TRAP (Flush & Squeeze)`**: $\text{Gap} \le -1.2\%$ AND $\text{Price} > \text{VWAP}$ AND $\text{CLV} \ge 0.75$.
- **`SECTOR_DIVERGENCE_TRAP`**: Stock Move $\ge +1.8\%$ while Sector Average $\le -0.5\%$.

---

## 🗄️ Database Tables (`gidh_intraday`)
- **Source Market Data**: `market.cash_candles_1m` (Hypertable), `market.instruments`.
- **Selection Persistence**: 
  - `ai.selection_sessions`: Aggregated session PnL, hit rates, playbook JSON, notes.
  - `ai.selection_picks`: Granular per-stock hypothesis, MFE, MAE, is_hit.
