import { DocArticle } from "./types";

export const QUANT_MICRO_DOC: DocArticle = {
  id: "quant-micro-protocol",
  title: "Micro Execution Brain & War Room Operating Manual",
  shortTitle: "Micro Execution Protocol",
  description: "Live 09:31 AM execution engine: opening range sensory feeds, 1.0% Fixed MAE stop standard, 2.0R target brackets, and EOD forensic memory distillation.",
  category: "quant",
  readTime: "4 min read",
  content: `
# Micro Execution Brain & War Room Operating Manual

The **Gidh Micro Execution Brain** (\`quant/brains/micro_brain\`) is the live market tactical execution engine. It bridges pre-market macro candidates to sub-minute order entries at **09:31:00 AM IST**.

---

## 1. Live Execution Pipeline Topology

\`\`\`mermaid
flowchart TD
    subgraph Phase1 [Phase 1: 08:45 AM Pre-Market Setup]
        Macro["MacroSelectorBrain<br/>• Multi-day capital inflows<br/>• Narrow CPR coiling springs<br/>• Saves Focus Bulls & Bears to DB"]
    end

    subgraph Phase2 [Phase 2: 09:15 - 09:30 AM Opening Range]
        M15["15-Minute Observation Window<br/>• Chill Guy Rule: Zero entries<br/>• Accumulates OR15 High/Low & Volume"]
    end

    subgraph Phase3 [Phase 3: 09:31:00 AM Tactical Sensing]
        Sensors["MicroSensorySensors<br/>• Opening Reaction (Gap %, CPR Pos)<br/>• VWAP Pullback & Slope<br/>• ORB Range & Wick Rejections<br/>• ADR Fuel Used % & 15m OI Delta"]
    end

    subgraph Phase4 [Phase 4: Autonomous Selection & Order Brackets]
        Rules["Execution Standard<br/>1. Filter Fuel & Gap Traps (&ge;80%)<br/>2. Select Top 4 Candidates<br/>3. Calculate 1.0% Fixed MAE Stops<br/>4. Calculate 2.0R Profit Targets"]
        Orders["quant.brain_sessions<br/>(Records 4 Live Bracket Orders)"]
    end

    subgraph Phase5 [Phase 5: 15:30 PM EOD Forensic Replay]
        Replay["EOD Simulator & Review<br/>• Replays every 1m bar<br/>• Measures MFE, MAE & Captured R<br/>• Updates quant.brain_memory"]
    end

    Macro --> M15
    M15 --> Sensors
    Sensors --> Rules
    Rules --> Orders
    Orders --> Replay
\`\`\`

---

## 2. The 3 Core Tactical Invariants

### A. 1.0% Fixed MAE Stop Cushion Standard
- **The Principle**: Tight technical pivots frequently get taken out by 09:15–09:30 AM opening liquidity shakeout noise. A **1.0% Fixed MAE** stop below limit entry provides the exact room needed for institutional accumulation to develop cleanly.
- **Formulas**:
  - **LONG**: $\\text{Stop Price} = \\text{Limit Entry} \\times 0.99$
  - **SHORT**: $\\text{Stop Price} = \\text{Limit Entry} \\times 1.01$

### B. 2.0R Fixed Profit Target Standard (2:1 R:R)
- **The Principle**: Intraday momentum typically exhausts into midday lunch lull. Clamping Target 1 to **2.0% distance** (2.0R return on risk) systematically captures asymmetric profits before afternoon chop.
- **Formulas**:
  - **LONG**: $\\text{Target 1} = \\text{Limit Entry} \\times 1.02$ (Clamped to ₹0.05 tick)
  - **SHORT**: $\\text{Target 1} = \\text{Limit Entry} \\times 0.98$ (Clamped to ₹0.05 tick)

### C. 0% ADR Fuel Exhaustion Trap Filter
- **The Principle**: Parabolic opening gaps or huge initial thrusts leave zero fuel for continuation.
- **Rejection Rules**:
  - If $\\text{ADR Fuel Used} \\ge 80\\% \\rightarrow$ **REJECT**.
  - If $\\text{Opening Gap} > +3.5\\% \\rightarrow$ **REJECT (Gap-Exhaustion Mean-Reversion Trap)**.

---

## 3. Daily War Room Operating Cadence

| Time Window | Operational Phase | Command / Prompt | AI & Brain Action |
| :--- | :--- | :--- | :--- |
| **08:45 – 09:00 AM** | **Pre-Market Setup** | *"Run Macro Brain"* | Senses 1D/3D inflows & CPR coils. Emits Focus Bulls & Bears into DB. |
| **09:15 – 09:30 AM** | **Opening Observation** | *Observation* | **Zero entries**. Tracks first 15m volume, VWAP divergence, and price rejection. |
| **09:31:00 AM** | **Live Execution** | **\`run micro brain\`** | Senses 15m opening metrics, selects Top 4 orders, and outputs exact 1.0% MAE brackets. |
| **15:30 PM** | **EOD Forensic Review** | *"Run EOD review"* | Replays minute bars, calculates captured R-multiples, and updates cognitive memory. |

---

## 4. Cognitive Memory Distillation Loop

\`\`\`mermaid
flowchart LR
    S["quant.brain_sessions<br/>(Daily Execution Ledger)"] -->|EOD Forensic Replay| R["review_sensor.py<br/>(Calculates Win Rate & MFE/MAE)"]
    R -->|Distills Lessons & Rules| M["quant.brain_memory<br/>(Persistent Rolling Memory)"]
    M -.->|Injects Context| B["Next Day 09:31 Micro Brain"]
\`\`\`

The cognitive memory buffer in \`quant.brain_memory\` retains rolling multi-session statistics, ensuring the AI continuously refines fill mechanics, stop cushions, and trap disqualification filters over time.
`
};
