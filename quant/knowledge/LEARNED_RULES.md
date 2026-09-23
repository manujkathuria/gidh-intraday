# Gidh Quant AI Learned Rules & Edge Knowledge Base

This file preserves all findings, edge conditions, and rules discovered across our daily session audits.

---

## 1. Capital Allocation & Risk Management Contract
- **Capital Budget**: ₹40,000 cash @ 5x leverage = **₹2,00,000 Total Purchasing Power**.
- **Fixed Decision Window**: Exactly **09:45 AM** (Zero lookahead / zero premature 09:30 entries).
- **Max Active Slots**: **Exactly 2 top stocks selected at 09:45 AM** (₹20,000 margin / ₹1,00,000 purchasing power per slot).
- **Hard Stop-Loss**: Placed 2–3 ticks above the morning peak high (strictly $\le 1.0\%$ MAE).
- **Target Structure**:
  - Target 1 (1:1 R:R): Move stop loss to breakeven immediately.
  - Target 2 (2:1 R:R): Book full profit (yielding +₹2,000 to +₹3,000 per trade).

---

## 2. Structural Trap Rules (Learned from Live Telemetry)

### Rule 1: The 15-Minute ADR Fuel Exhaustion Signature
- **Condition**: If a stock surges and burns $\ge 40\%$ of its 20-Day ADR in the first 15–20 minutes (`adr_fuel_used_pct >= 0.40`).
- **Edge**: In $> 85\%$ of cases, the daily energy budget is spent. The stock has no organic buyers left to push higher.

### Rule 2: The VWAP Breakdown Filter (Real Breakout vs Trap)
- **Condition**: Do NOT short a surging stock while it is still above VWAP ($84.4\%$ of them continue higher).
- **Edge**: Only trigger a SHORT once price breaks and stays submerged below Session VWAP (Sweet spot: $\sigma$ between $-0.80$ and $-0.10$).

### Rule 3: The 15-Minute Breakeven Trap Protection (Learned from HCLTECH on Sep 1)
- **Observation**: HCLTECH (Sep 1) dropped from ₹1332 to ₹1327 after entry, but reclaimed VWAP at 10:11 AM and stopped out.
- **Rule**: If a short position fails to make a new low and **reclaims Session VWAP from below** after 10:00 AM, exit immediately or move stop to breakeven. Never let a trade that reclaims VWAP turn into a full stop loss.

### Rule 4: The Extreme RVOL (> 10.0x) Block Deal Exclusion (Learned from COALINDIA on Sep 2)
- **Observation**: COALINDIA showed an extreme RVOL of **22.59x** with 600k+ shares per minute around 09:41 AM. When volume is that massive (> 10x), it indicates an institutional block deal / auction absorbing both sides, causing tight pinning to VWAP rather than a directional trap bleed.
- **Rule**: Reject candidates where $RVOL > 8.0x$ unless price is already trending away with large candle bodies. Optimal trap RVOL is **$1.5x - 5.0x$**.
