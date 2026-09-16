# Entry Brain — Operating Knowledge & Scoring Architecture

**Version**: 1.0 (Synthesized from 7-Day Empirical Sandbox + Institutional Market Mechanics)  
**Target Objective**: Screen and rank Top $\le 4$ high-conviction intraday entries (Long or Short) targeting $\ge +1.5\%$ MFE by 15:00 PM IST.

---

## 1. Core Market Principles & Baseline Facts

1. **Weak Side Reality**:
   - As retail traders, we do not predict or create moves. We detect where institutional volume is displacing price and hitchhike on their momentum after confirmation.
2. **The 09:30 AM (Bar 1) & 09:45 AM (Bar 2) Cadence**:
   - **09:30 AM (Bar 1 close)**: Primary impulse / breakout / trap recognition window. Highest velocity of displacement.
   - **09:45 AM (Bar 2 close)**: Acceptance / pullback-to-VWAP confirmation window.
3. **RVOL Sweet Spot vs Climax**:
   - **$3.0\text{x} - 5.0\text{x}$ RVOL**: The institutional sweet spot producing sustained $\ge +1.5\%$ MFE.
   - **$> 8.0\text{x} - 10.0\text{x}$ RVOL**: High risk of opening exhaustion / liquidity trap unless supported by continuous OI buildup.
4. **ADR Fuel Principle**:
   - A stock that has already consumed $>65\%$ of its Average Daily Range in the first 15 minutes is exhausted for trend continuation.

---

## 2. Deterministic 100-Point Scoring Model

Every stock is scored separately for **Long** and **Short** at decision time $t$ ($\le 10:00\text{ AM}$):

$$\text{Score} = \text{Participation} (25) + \text{Location} (20) + \text{Candle Quality} (20) + \text{Opening Range} (15) + \text{OI Confirmation} (10) + \text{ADR Fuel} (10) - \text{Penalties}$$

### A. Participation Score (Max 25 pts)
- $\text{RVOL} \in [3.0, 5.0]$: **25 pts**
- $\text{RVOL} \in [2.2, 3.0)$ or $(5.0, 7.0]$: **18 pts**
- $\text{RVOL} \in (7.0, 10.0]$: **10 pts**
- $\text{RVOL} > 10.0$: **5 pts** (Penalized for climax risk)
- $\text{RVOL} < 1.8$: **0 pts** (Insufficient volume)

### B. Location Score (Max 20 pts)
- **LONG**:
  - `cash_close > session_vwap` with `vwap_distance_sigma` $\in [+0.25, +1.75]$: **20 pts**
  - `vwap_distance_sigma` $\in (0, +0.25)$: **12 pts** (Testing VWAP)
  - `vwap_distance_sigma` $> +2.25$: **5 pts** (Overextended chase penalty)
- **SHORT**:
  - `cash_close < session_vwap` with `vwap_distance_sigma` $\in [-1.75, -0.25]$: **20 pts**
  - `vwap_distance_sigma` $\in (-0.25, 0)$: **12 pts**
  - `vwap_distance_sigma` $< -2.25$: **5 pts** (Overextended penalty)

### C. Candle Quality Score (Max 20 pts)
- **LONG**:
  - `clv >= 0.50`: **+10 pts** (Closes near bar high)
  - `upper_wick_pct <= 0.35`: **+5 pts** (Minimal rejection)
  - `bar_body / bar_range >= 0.45`: **+5 pts** (Solid body)
- **SHORT**:
  - `clv <= 0.00`: **+10 pts** (Closes near bar low)
  - `lower_wick_pct <= 0.35` or `upper_wick_pct >= 0.30`: **+5 pts** (Rejection from top)
  - `bar_body / bar_range >= 0.35`: **+5 pts**

### D. Opening Range 15m Breakout (Max 15 pts)
- **LONG**: `cash_close >= opening_range_15_high`: **15 pts**
- **SHORT**: `cash_close <= opening_range_15_low`: **15 pts**

### E. Institutional Derivatives / OI Confirmation (Max 10 pts)
- `oi_change_session > 0` AND `oi_change_15m > 0`: **10 pts** (Active institutional accumulation)
- `oi_change_session > 0`: **5 pts**
- `oi_change_session <= 0`: **0 pts** (No fresh derivative commitment)

### F. ADR Fuel Remaining (Max 10 pts)
- `adr_fuel_used_pct` $\in [20\%, 55\%]$: **10 pts** (Optimal expansion room)
- `adr_fuel_used_pct` $\in [0\%, 20\%)$: **5 pts** (Early stage)
- `adr_fuel_used_pct` $> 65\%$: **0 pts** (Exhaustion risk)

---

## 3. Hard Eligibility Gates (Pre-Filter)
A candidate is immediately **DISQUALIFIED** if:
1. `rvol < 1.8x` (Dead tape / lack of participation)
2. `adr_fuel_used_pct > 75%` at 09:30 (Move already done)
3. Total Composite Score $< 60 / 100$

---

## 4. Output Contract
- Pick Top $\le 4$ highest-scoring candidates across the entire 210 universe.
- Output: `Symbol`, `Side` (LONG/SHORT), `Entry Time` (09:30 or 09:45), `Score / 100`, `Key Factor Breakdown`.
