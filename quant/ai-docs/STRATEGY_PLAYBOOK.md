# Quant Strategy Playbook: Rules, Microstructure & Live Execution

This document details the quantitative screening rules, contradiction filters, battalion dynamics, manipulated candle traps, checkpoint execution lifecycle, and live War Room operating procedures.

---

## 1. Core Operating Philosophy (The "Chill Guy" Principle)

- **No Tick Watching**: Market makers hunt retail stop orders via high-speed 1-minute to 3-minute liquidity spikes. We **never** place tight mechanical stop orders in the broker order book.
- **15-Minute Bar Close Checkpoints**: Decisions (entry, hold-extension, split-exit, trailing ratchet, square-off) are executed **strictly on 15-minute bar closes** against VWAP.
- **Fixed Portfolio Geometry**: Exactly **5 trades × ₹10,000 margin** (5x MIS Leverage = ₹50,000 gross exposure each) across a ₹50,000 total capital pool.

---

## 2. Decision Screening Rules (09:30 & 09:45 IST)

### Long Candidate Criteria (`quant/tools/decision_screen.py`)
1. **Above VWAP**: `cash_close > session_vwap` at 09:30 or 09:45.
2. **Relative Volume (RVOL)**:
   - **Tier 1 (Monster)**: `RVOL >= 5.0x` (Earns lunchtime hold-extension into afternoon).
   - **Tier 3 (Standard)**: `2.0x <= RVOL < 5.0x` (Requires 11:30 Split-Exit discipline).
3. **Close Location Value (CLV)**: `CLV >= 0.50` (Strong buying closing at upper half of bar).
4. **Range / ATR Fuel**: `session_range_pct_atr` between `0.40` and `1.80`.

### Short Candidate Criteria (`quant/tools/decision_screen.py`)
1. **Below VWAP**: `cash_close < session_vwap` at 09:30 or 09:45.
2. **Relative Volume (RVOL)**: `relative_volume >= 2.0x`.
3. **Close Location Value (CLV)**: `CLV <= 0.30` (Heavy selling into candle low).
4. **Contradiction Filter**: Avoid buying green gap-ups with large upper rejection wicks; avoid shorting red gap-downs that closed on a massive lower rejection wick.

---

## 3. Sector Battalion Synchronicity Engine

- **Battalion Trigger**: When $\ge 2$ siblings in the same sector (e.g., Defense `HAL` + `BEL`, Realty `GODREJPROP` + `DLF` + `PRESTIGE`, Autos `EICHERMOT` + `HEROMOTOCO`) fire with `RVOL >= 2.0x` on the same side of VWAP.
- **Leader & Follower Dynamics**:
  - **Leader (09:30)**: First stock to break range with top RVOL and highest range ATR.
  - **Follower (09:45)**: Sibling confirming momentum at minute 30. High win rate (>82%) with minimal entry drawdown.
- **Tool**: Run `python3 quant/tools/battalion_scanner.py --time 09:30` (and `09:45`).

---

## 4. Manipulated Candle & Liquidity Trap Playbook

Smart money engineers liquidity sweeps to fill large order blocks. We capitalize on trapped retail volume:

| Trap Archetype | Candle Microstructure | Tactic | Execution Rule |
| :--- | :--- | :--- | :--- |
| **Bull Trap / False Breakout** | `upper_wick_pct >= 0.50` + `CLV < 0.20` + breaks below VWAP on `RVOL >= 3.0x` | `TACTIC_ZERO_CLV_SHORT` | **Short immediately on 15m close**. Trapped breakout buyers dump inventory all afternoon (e.g. `LT`, `CANBK`, `OIL`, `ONGC`). |
| **Bear Trap / Liquidity Spring** | `lower_wick_pct >= 0.50` + `CLV > 0.80` + reclaims VWAP on `RVOL >= 2.5x` | `TACTIC_PALADIN_RUSH` | **Long immediately on 15m close**. Stop-hunt is complete; upward expansion follows (e.g. `ICICIBANK`). |

---

## 5. Checkpoint Execution Protocol & Scout Trailing Rules

```text
09:30 -> Primary Screen (Tier 1 Monsters & 09:30 Battalion Leaders)
09:45 -> Confirmation & Trap Inversion (Fill portfolio to 5 trades)
10:45 -> First Trend Health Check
11:30 -> Mandatory Split-Exit Rule & Milestone Breakeven Ratchet
12:30 -> Midday Radar Health Check
14:30 -> Afternoon Power Hour Trailing Evaluation
15:15 -> Market-on-Close Square-Off
```

### The 11:30 Mandatory Split-Exit Rule
- At 11:30 AM, Scout inspects each active position against its 15-minute VWAP.
- **Rule**: Any **Tier 3 position** that has slipped to the wrong side of VWAP is **exited immediately at the 11:30 close**.
- **Result**: Converts potential afternoon losses into flat scratches (`-0.10%` to `-0.30%`).

### The Milestone Breakeven Ratchet Rules
- **+1.5% MFE Reached**: Scout flags `[🎯 Milestone +1.5% MFE]`. Stop floor is immediately ratcheted to **Entry Price (`0.0%`)**. The trade is 100% risk-free.
- **+2.5% MFE Reached**: Scout flags `[🎯 Milestone +2.5% MFE]`. Stop floor is ratcheted to **`+1.0%`**.

---

## 6. Position Sizing & Capital Pool Geometry

- **Total Capital Pool**: ₹50,000 INR account margin.
- **Position Allocation**: Exactly 5 trades × ₹10,000 margin each.
- **Zerodha MIS 5x Exposure**: ₹50,000 INR gross exposure per trade.
- **P&L Sensitivity**:
  - `+1.00%` stock move = `+₹500 INR` (+1.0% return on ₹50,000 total capital pool, +5.0% on deployed margin).
  - Stop loss at `-0.70%` = `-₹350 INR`.
  - 11:30 scratch at `-0.20%` = `-₹100 INR`.

---

## 7. Operational Tool Commands

```bash
# 1. Screen 09:30 & 09:45 Candidates
python3 quant/tools/decision_screen.py --time 09:30
python3 quant/tools/decision_screen.py --time 09:45

# 2. Scan for Synchronized Sector Battalions
python3 quant/tools/battalion_scanner.py --time 09:30
python3 quant/tools/battalion_scanner.py --time 09:45

# 3. Check Live Scout Radar at 11:30 / 12:30 / 14:30
python3 quant/tools/scout.py --time 11:30 --positions "HAL:long:4988.10,GODREJPROP:short:1775.50"

# 4. Checkpoint Trajectory Analyzer
python3 quant/tools/trade_tracker.py --symbols HAL BEL GODREJPROP COCHINSHIP

# 5. Daily Ledger Ingestion into PostgreSQL
python3 quant/tools/db_sync.py --day <N>
```
