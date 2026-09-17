# 🧠 GIDH BRAIN 1 (MARKET MACRO & SECTOR SELECTOR)

## 🎯 Role & Protocol
Brain 1 is the **Pre-Market Institutional Filter**. Tools measure market state; the **AI Assistant provides cognitive synthesis** (Zero `if/else` trading heuristics in Python code).

### 🏛️ 4-Layer Hierarchy
1. **Market Breadth & Net Inflow (₹ Cr)**: Classify broad market regime.
2. **Sector Capital Waves**: Identify top leading accumulation & lagging distribution sectors.
3. **High-Signal Stock Selection (Universe: ₹300 – ₹7,000)**:
   - 🟢 **Bulls**: 2-4 high-fuel (`fuel_pct > 30%`), narrow CPR stocks in leading sectors.
   - 🔴 **Bears**: 2-3 high-fuel distribution stocks in lagging sectors.
   - ⚠️ **Traps**: Blacklist exhausted moves (`fuel_pct < 20%`).
4. **Cognitive Memory**: Persist distilled rules & campaign tracking in `quant.brain_memory`.

---

## 🛠️ Canonical CLI Workflow

```bash
# 1. Inspect Sensory Packet & Active Cohorts
python3 quant/towncenter.py macro <YYYY-MM-DD>

# 2. Inspect Rolling Cognitive Memory
python3 quant/towncenter.py memory --brain macro_selector

# 3. Record Pre-Market Decisions (Direct CLI)
python3 quant/brains/macro_brain/runner.py <YYYY-MM-DD> --mode record \
  --regime "REGIME_LABEL" \
  --leader "LEADING_SECTOR" \
  --lagger "LAGGING_SECTOR" \
  --bulls SYMBOL1 SYMBOL2 \
  --bears SYMBOL3 SYMBOL4 \
  --traps TRAP1 TRAP2 \
  --thesis "Cognitive thesis narrative..."

# 4. Review Post-Market EOD Outcomes
python3 quant/brains/macro_brain/runner.py <PRIOR_SESSION_DATE> --mode review --outcome-date <OUTCOME_DATE> --forensics "Key learnings..."
```
