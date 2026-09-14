# GIDH OPERATING BRAIN

> **Distilled Intelligence Engine**  
> **Source**: 45-day historical replay (180 audited trades, +68.87% net realized P&L, 66.11% win rate, 3.42 PF).  
> **Database Sync**: `quant.brain_rules` table in TimescaleDB.  
> **Role**: Small, opinionated, executable rules for live market decisions.

---

## 1. Capital & Portfolio Allocation

| Rule ID | Rule Name | Specification | Confidence |
| :--- | :--- | :--- | :--- |
| `ALLOCATION_FIXED_5_SLOTS_01` | **5-Slot Equal Geometry** | ₹50,000 capital pool with 5x MIS leverage (₹2,50,000 gross). Exactly **5 slots × ₹10,000 margin** (₹50,000 exposure per trade). Max single-trade loss capped at ₹750 (-1.5%). | 1.00 |
| `ALLOCATION_TIME_STAGED_FILLS_02` | **Staged Deployment** | Fill Slots 1–3 at **09:30** (Mega-RVOL Paladins & Battalion Leaders). Reserve Slots 4–5 for **09:45** (Confirmed Squeezes & Manipulated Trap Shorts). | 0.88 |
| `ALLOCATION_DAILY_LOSS_CIRCUIT_03` | **Daily Circuit Breaker** | If realized intraday loss reaches **₹2,000 (-4.0%)**, immediately halt all trading and liquidate open positions. | 1.00 |

---

## 2. Entry Rules (When to Enter)

1. **`ENTRY_PALADIN_01` — Mega-RVOL Paladin Leader** (Conf: `0.85`)
   - **Trigger**: 09:30 or 09:45 bar close.
   - **Conditions**: `RVOL >= 10.0x`, `Price > VWAP`, `Return from Open > +1.0%`, `CLV >= 0.50`.
   - **Action**: Deploy ₹10,000 margin immediately as Priority 1 Long.

2. **`ENTRY_BATTALION_RESONANCE_02` — Battalion Synchronicity Long** (Conf: `0.82`)
   - **Trigger**: 09:30 or 09:45 bar close.
   - **Conditions**: $\ge 2$ sector siblings trading $> \text{VWAP}$ with sector mean $RVOL \ge 2.5x$.
   - **Action**: Buy the highest RVOL / highest CLV stock in the sector.

3. **`ENTRY_MANIPULATED_TRAP_SHORT_03` — Upper Wick / 0.000 CLV Trap Short** (Conf: `0.88`)
   - **Trigger**: 09:30 or 09:45 bar close.
   - **Conditions**: Opening candle left $\ge 50\%$ upper rejection wick, `CLV <= 0.20`, `RVOL >= 2.0x`, breaking below VWAP.
   - **Action**: Enter Short immediately. Target morning liquidity purge.

4. **`ENTRY_BREAKDOWN_MOMENTUM_04` — High-RVOL Breakdown Short** (Conf: `0.80`)
   - **Trigger**: 09:30 or 09:45 bar close.
   - **Conditions**: `RVOL >= 4.0x`, `Price < VWAP`, `Return from Open < -1.0%`, `CLV <= 0.15`.
   - **Action**: Enter Short with high-volume institutional distribution.

5. **`ENTRY_SQUEEZE_REVERSAL_05` — Opening Range Contraction Squeeze** (Conf: `0.76`)
   - **Trigger**: 09:45 bar close.
   - **Conditions**: 09:45 volume expands $> 1.5x$ vs 09:30, breaking opening range with extreme CLV ($>0.80$ or $<0.10$).
   - **Action**: Enter in direction of confirmed 09:45 expansion.

---

## 3. Invalidation & Exit Rules (When to Cut)

1. **`INVALIDATION_15M_BAR_CLOSE_01` — 15m Anti-Sweep Execution** (Conf: `0.94`)
   - **Rule**: Never trigger stops on 1-minute intraday wicks.
   - **Action**: Evaluate stops exclusively at `:00`, `:15`, `:30`, `:45` bar closes.

2. **`INVALIDATION_VWAP_CROSS_02` — Structural VWAP Invalidation** (Conf: `0.89`)
   - **Rule**: Longs closing $> 0.15\%$ below VWAP OR Shorts closing $> 0.15\%$ above VWAP on 15m close.
   - **Action**: Liquidate immediately at bar close.

3. **`INVALIDATION_CLV_DIVERGENCE_03` — CLV Exhaustion Invalidation** (Conf: `0.78`)
   - **Rule**: Long position makes higher price high, but 15m candle CLV collapses $< 0.20$ on dropping volume.
   - **Action**: Scratch position immediately.

4. **`INVALIDATION_SECTOR_ABANDONMENT_04` — Battalion Defection** (Conf: `0.81`)
   - **Rule**: Sector battalion thesis invalidated when 2 out of 3 sector peers reverse negative or lose VWAP.
   - **Action**: Exit position even if individual stock has not yet broken VWAP.

5. **`INVALIDATION_MAX_SL_HARD_CAP_05` — Absolute Hard Stop Ceiling** (Conf: `1.00`)
   - **Rule**: Adverse move reaches $-1.50\%$ on underlying price at any time.
   - **Action**: Hard emergency market cut to cap risk at ₹750.

---

## 4. Hold & Trailing Rules (When to Hold)

1. **`HOLD_SPLIT_EXIT_1130_01` — 11:30 Mandatory Split-Exit** (Conf: `0.87`)
   - **Rule**: At 11:30 IST, inspect all Tier 3 ($RVOL < 5.0x$) positions.
   - **Action**: Square off any Tier 3 position with P&L between $-0.3\%$ and $+0.3\%$ or losing VWAP. Only Tier 1 Paladins or strong Battalion runners may hold past 11:30.

2. **`HOLD_SHORT_EXTENSION_02` — Afternoon Short Extension** (Conf: `0.84`)
   - **Rule**: Short positions holding strictly below VWAP past 11:30 with neutral/weak market breadth.
   - **Action**: Hold through lunch into the 14:30 / 15:15 checkpoint for maximum range expansion.

3. **`HOLD_RATCHET_MILESTONES_03` — Milestone Trailing Floor Ratchet** (Conf: `0.92`)
   - **MFE $\ge +1.50\%$**: Ratchet stop floor to **Entry ($0.0\%$ Breakeven)**.
   - **MFE $\ge +2.50\%$**: Ratchet stop floor to **$+1.00\%$ profit lock**.
   - **MFE $\ge +4.00\%$**: Ratchet stop floor to **$+2.50\%$ profit lock**.

---

## 5. No-Trade Rules (What to Avoid)

1. **`NO_TRADE_LUNCH_LULL_01` — No Fresh Lunch Entries (11:30 – 13:45)** (Conf: `0.95`)
   - **Rule**: Zero fresh positions initiated between 11:30 and 13:45 IST.

2. **`NO_TRADE_RED_ABOVE_VWAP_TRAP_02` — Above-VWAP Red Name Trap** (Conf: `0.86`)
   - **Rule**: DO NOT buy stocks that opened with a large gap down and drifted above VWAP while remaining negative on the day.

3. **`NO_TRADE_LONE_WOLF_NO_BATTALION_03` — Lone Wolf Without Mega-RVOL** (Conf: `0.83`)
   - **Rule**: Pass on single stocks without sector peer confirmation unless individual $RVOL \ge 8.0x$.

---

## 6. Active Character Memory (Top 10 Profiles)

1. **`COCHINSHIP`**: High-beta momentum beast. When $RVOL > 5x$, trends 4–7% without touching VWAP.
2. **`BANDHANBNK`**: Heavy 1m opening fakeout wicks; strictly respects 15m VWAP bar closes.
3. **`RBLBANK`**: Persistent multi-day institutional flows; reliable VWAP-respecting trend long.
4. **`MAHABANK`**: Explosive low-priced PSU bank leader; trades in lockstep with CANBK & PNB.
5. **`HDFCLIFE`**: High-volume clean breakdown short; persistent downward trend into 14:30.
6. **`ICICIPRULI`**: Insurance sector breakdown executor; mirror companion to HDFCLIFE.
7. **`ONGC` / `OIL`**: Upstream energy bull-trap masters; 09:15 upper wicks produce high-probability 09:45 trap shorts.
8. **`LT`**: Heavyweight benchmark; institutional distribution shows as failed 09:30 breakouts.
9. **`KEI`**: High-beta cable manufacturer; clean breakdowns once 15m VWAP is broken.
10. **`IDEA`**: Ultra-liquid penny momentum vehicle; massive directional trending on $RVOL > 10x$.

---

## 7. Active Battalion Memory (Top 5 Battalions)

1. **PSU Banks** (`CANBK`, `PNB`, `MAHABANK`, `SBIN`, `BANKBARODA`): Explosive opening synchronicity. When $\ge 2$ fire, sector runs all day.
2. **Mid/Private Banks** (`BANDHANBNK`, `RBLBANK`, `FEDERALBNK`, `IDFCFIRSTB`, `AUBANK`): High beta opening whipsaws that respect 15m closes.
3. **Life Insurance** (`HDFCLIFE`, `ICICIPRULI`, `SBILIFE`): High correlation (>0.85); top shorting vehicles on weak tape days.
4. **Upstream Energy** (`ONGC`, `OIL`, `GAIL`): Gap-up fakeouts; prime 09:45 trap short sector.
5. **Defence & Shipbuilding** (`COCHINSHIP`, `MAZDOCK`, `GRSE`, `HAL`, `BDL`): Institutional momentum leaders; 5%+ daily ranges.

---

## 8. Brain Promotion Lifecycle

```
[Historical / Live Replay]
           │
           ▼
[quant.sessions & quant.trades] (Raw Memory: What happened?)
           │
           ▼
[quant.lessons] (Distilled Intelligence: What have we learned?)
           │
           ▼
[Promotion Filter: Repeated Principle across multiple sessions?]
           │
     ┌─────┴─────┐
    YES          NO
     │           │
     ▼           ▼
[quant.brain_rules] (Keep in lessons only)
[OPERATING_BRAIN.md] (Live Operating Brain: What should we do now?)
```
