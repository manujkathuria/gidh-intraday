# ⚡ BRAIN 2: MICRO EXECUTION & SQUEEZE ENGINE

> **Role in Hierarchy**: Brain 2 ingests the candidate pool selected by Brain 1 (Macro Selector) and executes precision entries between **09:16 and 10:00 AM** to squeeze maximum alpha/paisa from the trade.

---

### 1. Two-Shot Execution Cadence (Zero 1-Minute Polling)

| Checkpoint | Time | Focus & Action |
| :--- | :--- | :--- |
| **CP-1: Opening Gate** | `09:18 AM` | Evaluates opening prints vs CPR, Open=High/Low, and early 3-min RVOL. Drops failed setups; sets early momentum limits. |
| **CP-2: OR15 Lock** | `09:31 AM` | 15-min Opening Range (OR15 High/Low) and 15-min OI Delta lock in. Finalizes **Top 4** trades, sets exact pullback limit entries, stops, and targets. |

---

### 2. Sensory Tools (`quant/brains/micro_brain/tools/`)

1. **`opening_reaction_sensor.py`**:
   - `opening_gap_pct`, `open_cpr_position` (`ABOVE_TC`, `INSIDE_CPR`, `BELOW_BC`), `open_equals_low`, `open_equals_high`, `rvol_3m`, `clv_3m`.
2. **`vwap_pullback_sensor.py`**:
   - `session_vwap`, `vwap_slope`, `vwap_distance_sigma`, `vwap_upper/lower_1` ($\pm 1\sigma$), `vwap_upper/lower_2` ($\pm 2\sigma$), `suggested_pullback_price`.
3. **`orb_structure_sensor.py`**:
   - `or15_high`, `or15_low`, `or15_midpoint`, `or15_range_pct_atr`, `upper_wick_pct`, `lower_wick_pct`, `structural_stop_price`.
4. **`fuel_and_oi_sensor.py`**:
   - `adr_fuel_used_pct`, `remaining_target_price`, `oi_change_15m`, `futures_basis_pct`.
5. **`micro_simulator.py`**:
   - Deterministic simulator evaluating limit fills, stops, and target hits across remaining intraday bars.

---

### 3. CLI Operations (`quant/towncenter.py` & `runner.py`)

```bash
# 1. Inspect opening sensory facts
.venv/bin/python quant/towncenter.py micro 2026-09-01 --time 09:31:00

# 2. Extract full sensory JSON for AI reasoning
.venv/bin/python quant/brains/micro_brain/runner.py sense 2026-09-01

# 3. Record AI trade plans
.venv/bin/python quant/brains/micro_brain/runner.py record 2026-09-01 --file /path/to/decisions.json

# 4. Simulate outcomes across session candles
.venv/bin/python quant/brains/micro_brain/runner.py simulate 2026-09-01

# 5. Record EOD forensics & update rolling memory
.venv/bin/python quant/brains/micro_brain/runner.py review 2026-09-01 --summary "..."
```
