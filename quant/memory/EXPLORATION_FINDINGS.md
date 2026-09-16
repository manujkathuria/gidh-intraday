# Entry Brain — Exploration Memory & Initial Hypotheses

**Generated**: 2026-09-16  
**Sandbox Sessions Analyzed**: `2026-07-13` to `2026-07-21` (7 Days, 1,470 Stock-Sessions)  
**Objective**: Discover high-probability 09:15–10:00 AM entry signals targeting $\ge +1.5\%$ MFE by 15:00 PM.

---

## 1. Raw Market Baseline (Random Pick at 09:30 AM)
Across 210 liquid F&O stocks without filtering:
- **Long $\ge +1.5\%$ MFE Rate**: `22.7%` (Average excursion: `+1.03%`)
- **Short $\ge +1.5\%$ MFE Rate**: `14.9%` (Average excursion: `+0.81%`)

---

## 2. Critical Statistical Findings

### A. Relative Volume (RVOL at 09:30 AM)
| 09:30 RVOL Tier | Count | Long Win Rate | Short Win Rate | Avg Long MFE | Avg Short MFE |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `< 1.5x` (Low) | 1,225 | 22.3% | 13.2% | +1.04% | +0.81% |
| `1.5x - 3.0x` (Normal) | 170 | 22.4% | 22.4% | +0.98% | +1.04% |
| `3.0x - 5.0x` (High) | 36 | **30.6%** | **22.2%** | **+1.48%** | **+1.54%** |
| `5.0x - 10.0x` (Heavy) | 26 | **30.8%** | **34.6%** | **+1.34%** | **+1.44%** |
| `> 10.0x` (Extreme) | 13 | 30.8% | 15.4% | +1.11% | +1.35% |

**Rule Insight**: 
- The sweet spot for sustained trend displacement is **RVOL 3.0x to 5.0x**.
- Extreme RVOL (>10x) often acts as a liquidity climax / opening trap with poor follow-through.

---

### B. Confluence Setups

#### 1. Bull Displacement Setup (LONG)
- **Criteria**:
  - `rvol >= 3.0x`
  - `cash_close > session_vwap` (Accepted above VWAP)
  - `clv >= 0.50` (Bar 1 closes in upper 50% of its range)
- **Performance**:
  - Win Rate ($\ge +1.5\%$ MFE): **42.9%** (vs 22.7% baseline)
  - Average Long MFE: **+1.62%**

#### 2. Bear Displacement & Wick Trap Setup (SHORT)
- **Criteria**:
  - `rvol >= 3.0x`
  - `cash_close < session_vwap` (Rejected below VWAP)
  - `clv <= 0.0` or `upper_wick_pct >= 0.30` (Bar 1 rejected from highs, closes in lower half)
- **Performance**:
  - Win Rate ($\ge +1.5\%$ MFE): **66.7%** (vs 14.9% baseline)
  - Average Short MFE: **+3.27%**

#### 3. Entry Timing: 09:30 vs 09:45
- **09:30 AM (Bar 1 close)** provides the best entry price before the large displacement occurs.
- **09:45 AM (Bar 2 close)** shows degraded baseline win rates (19.3% vs 22.7%) because +1.5% targets are partially consumed in the first 30 minutes. Use 09:45 only for secondary pullback confirmations.

---

## 3. Seed Operating Strategy for Day 1 (`2026-07-22`)
1. At 09:30:00 AM IST, scan all 210 instruments.
2. Filter for candidates with `rvol >= 2.5x` and clean directional alignment:
   - **LONG candidates**: `cash_close > session_vwap` AND `clv >= 0.50`.
   - **SHORT candidates**: `cash_close < session_vwap` AND `clv <= 0.0`.
3. Rank candidates by composite score: $\text{Score} = \text{RVOL} \times |\text{CLV}|$.
4. Select the **Top $\le 4$ entries** (max 4 total across Long/Short).
5. Output picks, then unveil scorecard at 15:00 PM for evaluation & reflection.
