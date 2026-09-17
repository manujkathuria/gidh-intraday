# 🧠 GIDH BRAIN 1: PRE-MARKET MACRO SELECTOR

---

## 1. Role & Mandate
**Brain 1 (Macro Selector)** is an autonomous pre-market institutional surveillance engine. Its sole responsibility is to evaluate market structure **before 09:15 AM IST** and emit the day's **Focus Trading Universe**:

1. **Focus Bulls**: Top stocks with verified institutional capital inflow and unexhausted ADR range fuel.
2. **Focus Bears**: Top breakdown candidates with heavy capital outflow and compressed resistance.
3. **Exhaustion / Trap List**: High-volume stocks that have already burned their 3-day ATR fuel (blacklisted from long buys).

Once the focus universe is emitted, **Brain 1 hands off to the Micro Brains and finishes its pre-market duties**.

---

## 2. Sensory Tools

Brain 1 utilizes 3 dedicated sensory tools located in `quant/brains/macro_brain/tools/`:

- **Tool 1 (`futures_sensor.py`)**:
  - 1D, 3D, 5D Fresh Capital Inflow ($\Delta \text{OI} \times \text{Price}$ in ₹ Crores)
  - Futures Price $\Delta\%$ & OI $\Delta\%$
  - Total Futures Notional Size
- **Tool 2 (`structure_sensor.py`)**:
  - CPR Width % ($|\text{TC} - \text{BC}| / \text{Pivot} \times 100$)
  - 20 / 50 / 200 Day Moving Averages
  - 20-Day High / Low Proximity (Clear Air vs Air Pockets)
  - 3-Day Range vs 20-Day ADR (Macro Fuel %)
- **Tool 3 (`review_tool.py`)**:
  - Actual cash market execution outcomes on Date $T+1$ (Open, High, Low, Close)
  - Gap %, Max Intraday Expansion (MFE), Max Drawdown (MAE), EOD Net %
  - Trap Fade % (Performance vs Open)

---

## 3. The 3-Stage Daily Lifecycle

```
[08:30 AM Pre-Market]
  Tool 1 (Futures) + Tool 2 (Structure) -> Raw Sensory Packet -> AI Evaluates -> Saves to `quant.brain_sessions`
                                                        │
                                                        ▼
[09:15 AM - 03:30 PM Intraday]
  Micro Brains trade the Focus Universe using 1-minute order flow
                                                        │
                                                        ▼
[03:45 PM Post-Market EOD]
  Tool 3 (Review Tool) measures actual outcomes -> AI writes EOD Forensics -> Updates `quant.brain_memory`
```

---

## 4. How to Run & Verify

```bash
# Ingest sensory packet and view top candidates:
.venv/bin/python3 -m quant.towncenter macro 2026-09-08

# Check rolling memory state:
.venv/bin/python3 -m quant.towncenter memory --brain macro_selector
```
