# 🏛️ GIDH INTRADAY AI WAR ROOM: OPERATING MANUAL

This document specifies the live operating commands and agent execution protocol for **Brain 1 (Macro Selector)** and **Brain 2 (Micro Execution Brain)**.

---

## ⏰ Daily Cadence & Simple User Prompts

| Time | Phase | What the User Says to Antigravity | What Antigravity AI Executes |
| :--- | :--- | :--- | :--- |
| **08:45 – 09:00 AM** | **Pre-Market Setup** | *"Run Macro Brain"* or *"Prepare today's pre-market"* | 1. Senses multi-day inflows & sector coils.<br>2. Selects Top Focus Bulls & Bears.<br>3. Saves to `quant.brain_sessions`. |
| **09:31:00 AM** | **Live Execution** | **`run micro brain`** or **`execute 9:31`** | 1. Senses 09:15–09:30 Opening Range reaction.<br>2. Evaluates RVOL, CLV, OI, and ADR Fuel.<br>3. Selects the **Best 4 execution candidates**.<br>4. Calculates 1.0% MAE Stop Loss and 2.0R targets.<br>5. Records decisions into DB and displays execution table. |
| **15:30 PM** | **EOD Review** | *"Run EOD review"* or *"Review today's session"* | 1. Deterministically replays minute bars.<br>2. Calculates captured R-multiples & win rate.<br>3. Generates forensic learnings & updates `quant.brain_memory`. |

---

## 🚀 09:31 AM Micro Execution Protocol (Step-by-Step)

When the user says **`run micro brain`** or **`execute 9:31`** at 09:31 AM:

### 1. Sense Real-Time Market State
Run the deterministic sensory tool:
```bash
.venv/bin/python quant/brains/micro_brain/runner.py sense $(date +%Y-%m-%d)
```

### 2. Autonomous AI Reasoning & Selection
Using the sensory packet and [PROMPT.md](file:///Users/manujkathuria/workspace/gidh/gidh-intraday/quant/brains/micro_brain/PROMPT.md), apply our core rules:
- **Disqualify Traps**:
  - `adr_fuel_used_pct >= 80%` $\rightarrow$ Reject (Fuel Exhausted).
  - `opening_gap_pct > +3.5%` $\rightarrow$ Reject (Gap-Exhaustion Mean-Reversion Trap).
- **Select Best 4 Candidates**: Highest RVOL, positive VWAP slope for Longs, negative slope for Shorts, institutional OI buildup.
- **Set 1.0% Fixed MAE Price Bracket**:
  - Long: `Stop = Entry × 0.99` | `Target 1 = Entry × 1.02` (clamped to ₹0.05).
  - Short: `Stop = Entry × 1.01` | `Target 1 = Entry × 0.98` (clamped to ₹0.05).

### 3. Record Execution Decisions
```bash
.venv/bin/python quant/brains/micro_brain/runner.py record $(date +%Y-%m-%d) --json '<DECISIONS_JSON>'
```

### 4. Present the High-Density War Room Table
Render the 4 approved bracket orders clearly to the user:
```markdown
| Symbol | Bias | Limit Entry | 1.0% MAE Stop Loss | Target 1 (2.0R) | R:R | Key AI Thesis |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`ADANIENSOL`** | **LONG** | ₹1349.05 | ₹1335.55 | ₹1376.05 | 2:1 | Only 23% ADR fuel used, 38.8 pts runway. |
```

---

## 📊 15:30 PM EOD Review Protocol

When the user says **`review today`** or **`eod review`**:

1. **Replay Actual Execution**:
   ```bash
   .venv/bin/python quant/brains/micro_brain/runner.py simulate $(date +%Y-%m-%d)
   ```
2. **Commit Forensics & Update Cognitive Memory**:
   ```bash
   .venv/bin/python quant/brains/micro_brain/runner.py review $(date +%Y-%m-%d) --summary "<SUMMARY_OF_LESSONS>"
   ```
