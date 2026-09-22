# Gidh Quant Lab & Exercise Operating Framework

This document codifies the standard walk-forward operating procedure for quantitative research across all historical trading sessions.

---

## 1. Operating Architecture: Walk-Forward Dual-Engine

Every trading session (Day N) is processed in two strict, consecutive phases to prevent future-data contamination while compounding quantitative intelligence.

```
+-------------------------------------------------------------------------+
|                         START OF DAY (09:20 AM)                         |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                          PHASE 1: THE EXERCISE                          |
|                     (Live Blind Simulation Engine)                      |
|                                                                         |
| - Truncate database queries strictly at 09:20:00 IST.                   |
| - Consult prior intelligence files (Day 1 through Day N-1).             |
| - Pick EXACTLY 4 STOCKS (2 Longs, 2 Shorts) with Rs 10,000 margin @ 5x.|
| - Seal picks and rationales into quant/lab/EXERCISE_DAY<N>.md.          |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                            PHASE 2: THE LAB                             |
|                    (Ground Truth & Discovery Engine)                    |
|                                                                         |
| - Reveal the full session (09:20 to 15:00 PM).                          |
| - Score the 4 Exercise picks (Realized P&L, MFE %, Exit timing).        |
| - Extract the true Top 10 Bulls and Top 10 Bears of the 210 universe.   |
| - Reverse-engineer the "Why" (catalysts, sector waves, volume flushes). |
| - Distill compounding human axioms into quant/discoveries/.             |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|            INTELLIGENCE COMPOUNDS FOR NEXT SESSION (DAY N+1)            |
+-------------------------------------------------------------------------+
```

---

## 2. Core Comparison & Responsibilities

| Dimension | Phase 1: The Exercise | Phase 2: The Lab |
| :--- | :--- | :--- |
| **Primary Goal** | Test if our accumulated intelligence makes real-time money. | Discover market truth, inspect edge cases, and teach the brain. |
| **Data Scope** | **Zero Lookahead**: `market.daily_features` pre-market baseline + 09:15-09:20 1m bar only. | **Full Session**: `market.cash_candles_1m` from 09:20:00 to 15:00:00 IST. |
| **Capital & Sizing** | Exactly **4 positions** (2 Longs, 2 Shorts) @ Rs 10k margin (5x). | Full universe (Top 10 Longs, Top 10 Shorts ranked by Rupee P&L). |
| **Decision Input** | Historical intelligence files (`quant/discoveries/`). | Actual intraday market outcomes. |
| **Output Artifacts** | `quant/lab/EXERCISE_DAY<N>.md` | `quant/lab/NN_GROUND_TRUTH_DAY<N>.md`<br>`quant/discoveries/NN_DAY<N>_INTELLIGENCE.md` |
| **Feedback Loop** | Measures hit rate, P&L, and strategy execution quality. | Extracts new axioms to upgrade candidate selection on Day N+1. |

---

## 3. Database Reference Architecture (The Lean 3-Table Stack)

1. **`market.instruments`**: Master tradeable universe and sector classification.
2. **`market.daily_features`**: Pre-market baseline snapshot containing CPR floor/ceiling (`cpr_pivot`, `cpr_bc`, `cpr_tc`), `adr_20`, `sma_20`, `sma_50`, 5-day / 20-day returns, and 5-day Open Interest build-up (`futures_oi_change_5d_pct`).
3. **`market.cash_candles_1m`**: High-resolution 1-minute live bars used for 09:15 gap vs `prior_close`, opening 5-minute relative volume (RVOL) and price velocity, 09:20 entry, and 09:20-15:00 MFE tracking.

*Note: `market.cash_candles_1d` and `market.preopen_snapshots` are excluded from daily screening as all features are pre-calculated.*

---

## 4. Standard Execution Pipeline (Using the Python CLI Tool Suite)

### Phase 1 Execution (09:20:00 AM IST Blind Selection)
1. Run the blind 09:20 screener:
   ```bash
   .venv/bin/python quant/tools/screen_0920.py <YYYY-MM-DD>
   ```
2. Read [quant/brain/MEMORY.md](file:///Users/manujkathuria/workspace/gidh/gidh-intraday/quant/brain/MEMORY.md).
3. Select **2 Longs** matching Setup B1 (RVOL >4.5x), B2 (Sisters), or B3 (Super-Leader).
4. Select **2 Shorts** matching Setup S1 (Fade), S2 (Distribution), or S3 (Flush).
5. Verify candidates pass the "Never Do" anti-patterns.
6. Commit the 4 picks with rationales into `quant/lab/EXERCISE_DAY<N>.md`.

### Phase 2 Execution (Ground Truth & Intelligence Discovery)
1. Run the evaluation and ground truth engine:
   ```bash
   .venv/bin/python quant/tools/evaluate_day.py <YYYY-MM-DD> --longs SYM1 SYM2 --shorts SYM3 SYM4
   ```
2. Save the market-wide Top 10 Bulls and Top 10 Bears into `quant/lab/NN_GROUND_TRUTH_DAY<N>.md`.
3. Update `quant/lab/EXERCISE_DAY<N>.md` with realized P&L, MFE %, and market ranks.
4. Extract 2-3 new human axioms into `quant/discoveries/NN_DAY<N>_INTELLIGENCE.md`.
5. Update `quant/brain/MEMORY.md` with any new rules or refined thresholds.

---

## 5. Documentation Standards
- Zero ASCII art, zero emojis.
- Precise numbers, timestamps, and rupee amounts.
- All intelligence files must describe human mental models and behavioral rules rather than isolated statistics.
