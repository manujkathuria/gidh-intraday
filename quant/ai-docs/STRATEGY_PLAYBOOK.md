# Strategy Playbook: Rules, Filters & Live Execution

This document details the quantitative screening rules, contradiction filters, checkpoint execution lifecycle, and live war room commands.

---

## 1. Decision Screening Rules (09:30 & 09:45 IST)

### Long Candidate Criteria (`quant/tools/decision_screen.py`)
1. **Above VWAP**: `cash_close > session_vwap` at 09:30.
2. **Relative Volume (RVOL)**: `relative_volume >= 2.0x` (Tier 1 >= 15x, Tier 2: 5x-15x, Tier 3: 2x-5x).
3. **Close Location Value (CLV)**: `CLV >= 0.50` (preference for high closing range).
4. **Range / ATR Fuel**: `session_range_pct_atr` between `0.40` and `1.80`.
5. **Contradictory Open Filter**: Reject any long candidate whose cash open return is significantly negative or displaying opening breakdown wicks.

### Short Candidate Criteria (`quant/tools/decision_screen.py`)
1. **Below VWAP**: `cash_close < session_vwap` at 09:30.
2. **Relative Volume (RVOL)**: `relative_volume >= 2.0x`.
3. **Close Location Value (CLV)**: `CLV <= 0.30` (strong selling into candle low).
4. **Contradictory Open Filter**: Reject any stock with positive cash open return (e.g. gapped up and bouncing), avoiding false breakdown traps.

---

## 2. Checkpoint Protocol & Trajectory Rules

Every trade is tracked across fixed mark-to-market checkpoints:

```text
09:30  -> Primary Screen & Candidate Selection (3 - 5 Trades)
09:45  -> Confirmation & Order Execution
10:45  -> Momentum Follow-through Check
11:30  -> Split-Exit Rule Check (MANDATORY VWAP Evaluation)
12:30  -> Midday Health Check
14:30  -> Afternoon Acceleration & Trailing Stop Placement
15:15  -> Market-on-Close Square-off
```

### The 11:30 Split-Exit Rule
- At 11:30, review the price of each active trade against its 15-minute VWAP.
- **Rule**: If a Tier 3 candidate has slipped below VWAP (for Longs) or above VWAP (for Shorts), exit immediately at the 11:30 close.
- **Goal**: Prevent morning runners from turning into full-day bleeding losses; average scratch is contained to -0.20% to -0.30%.

---

## 3. Position Sizing & Leverage Math

- **Capital Allocation**: ₹50,000 INR account margin.
- **Position Count**: 5 trades max.
- **Margin Per Trade**: ₹10,000 INR cash margin.
- **Zerodha MIS 5x Exposure**: ₹50,000 INR gross position value per trade.
- **P&L Impact**:
  - A +1.00% stock move = +₹500 INR profit (+1.0% return on ₹50,000 total capital pool, +5.0% on deployed margin).
  - Stop loss at -0.80% = -₹400 INR loss.
  - 11:30 scratch at -0.20% = -₹100 INR.

---

## 4. Operational CLI Tools Reference

```bash
# 1. Run 09:30 decision screens
python3 quant/tools/decision_screen.py --day 26 --time 09:30

# 2. Run sector battalion scanner
python3 quant/tools/battalion_scanner.py --day 26 --time 09:30

# 3. Track checkpoint trajectory
python3 quant/tools/trade_tracker.py --day 26 --symbols VOLTAS BDL MOTILALOFS

# 4. View market-wide session breadth
python3 quant/tools/session_breadth.py --day 26

# 5. Sync markdown card to TimescaleDB
python3 quant/tools/db_sync.py --day 26
```
