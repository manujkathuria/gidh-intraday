# 🦅 GIDH Quant Architecture & Strategic Mandate

Welcome to the **GIDH Quant Base** (`quant/`). This document is the institutional blueprint for any AI agent or quant developer collaborating on this repository.

---

## 1. Core Philosophy: The Vulture (Gidh) Mandate
- **80% Premarket Selection & Institutional Surveillance**: We do not predict or guess moves. We identify multi-day campaigns where institutional heavyweights (FIIs, DIIs, prop desks) have already deployed billions in fresh Futures Open Interest.
- **20% Micro-Gate Confirmation (Feast After the Kill)**: We act strictly *after* institutional intent is confirmed at market open. We enter early (09:16 to 09:45 AM) only when price respects VWAP, relative volume surges, and ADR fuel is not exhausted.
- **Zero Overnight Ruin**: 100% intraday MIS with 5x leverage on ₹50,000 gross position sizes (₹10,000 margin per stock). Max 4 concurrent slots. All positions flat before 15:30 IST.

---

## 2. Directory Architecture

```
quant/
├── base/                   # Core DB connections, capital sizing, and shared models
│   ├── db.py               # TimescaleDB connection pool & sizing constants
│   └── models.py           # CampaignStage, OrderSide, TradeSignal, TradeResult dataclasses
│
├── campaigns/              # Institutional Macro Engine (Daily EOD & Pre-Market)
│   ├── tracker.py          # State Machine: Day 1 Launch -> Active Continuation -> Coiling -> Exhaustion
│   └── scanner.py          # 5-Gate Funnel (Liquidity, Triple SMAs, Futures OI Surge, 20D Proximity)
│
├── execution/              # Micro Execution & Simulation Engine (1-Minute Intraday)
│   └── simulator.py        # Dynamic 1-min early execution (09:16 - 09:45 AM) with ADR Fuel Gate (<50%)
│
├── evolution/              # Self-Refining Forensic Analysis (The Lab)
│   └── post_mortem.py      # EOD trade forensics (Win Rate, Profit Factor, MFE/MAE, Fuel metrics)
│
├── inspector.py            # Volume Profile, Point of Control (POC), Low-Volume Voids
├── towncenter.py           # Unified CLI Cockpit for Research, Scanning, and Live Simulation
└── ai-docs/                # Institutional Knowledge & Agent Context Documentation
```

---

## 3. The 5-Gate Premarket Selection Funnel
Every morning before 09:15 AM, the system runs a 5-gate query across all ~210 F&O stocks:

1. **Gate 1 (Liquidity & Spread Protection)**:
   - `prior_close` between ₹300 and ₹5,000.
   - `average_daily_volume_20` $\ge 500,000$ shares/day.
   - `adr_20_pct` $\ge 1.85\%$.
2. **Gate 2 (Macro Trend Alignment)**:
   - Bullish: `prior_close > sma_20 >= sma_50` and `prior_close > sma_200`.
   - Bearish: `prior_close < sma_20 <= sma_50` and `prior_close < sma_200`.
3. **Gate 3 (Institutional Fresh Fuel Injection)**:
   - `futures_oi_1d_change_pct` $\ge +5.0\%$ (proves institutional capital block commitment).
4. **Gate 4 (Price Conviction)**:
   - Longs: `futures_price_change_pct` $\ge +1.0\%$ (Long Buildup).
   - Shorts: `futures_price_change_pct` $\le -1.0\%$ (Short Buildup).
5. **Gate 5 (Clear Air Proximity)**:
   - Longs: `distance_20d_high_pct` $\le 4.0\%$ (Zero overhead trapped bagholders).
   - Shorts: `distance_20d_low_pct` $\le 4.0\%$ (Falling into air pockets).

---

## 4. The 4 Micro-Gates (09:16 to 09:45 AM Execution)
Do **NOT** wait for a rigid 09:30 AM timer. Evaluate every 1-minute candle dynamically:

1. **Fuel Gate (`adr_fuel_used_pct < 50%`)**: Never chase a stock that has burned $\ge 50\%$ of its ADR before entry (avoids buying the peak of rubber-band moves).
2. **VWAP Gate**: Price strictly above VWAP for Longs / strictly below VWAP for Shorts.
3. **RVOL Gate**: `relative_volume >= 0.80x` (active institutional flow).
4. **Level Breakout**: Price breaks 5-min Opening Range (ORB5) or Prior Day High/Low.

---

## 5. Capital & Sizing Model
- **Capital**: ₹10,000 margin per stock $\times$ 5x MIS leverage = **₹50,000 gross position size**.
- **Quantity Formula**: $\text{Shares} = \lfloor 50,000 / \text{Entry Price} \rfloor$.
- **Friction**: Exact ₹70 round-trip deduction per ₹50k trade (brokerage + STT + exchange turnover fees).
- **Max Concurrent Positions**: 4 slots.

---

## 6. How to Run & Verify
```bash
# Scan active campaigns
.venv/bin/python -m quant.towncenter campaigns 2026-08-25

# Generate 08:45 AM pre-market watchlist
.venv/bin/python -m quant.towncenter scan 2026-08-25

# Replay dynamic 1-min simulation & see net realized PnL
.venv/bin/python -m quant.towncenter simulate 2026-08-25

# Run EOD post-mortem forensic analysis
.venv/bin/python -m quant.towncenter evolve 2026-08-25
```
