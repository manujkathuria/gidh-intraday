import { DocArticle } from "./types";

export const QUANT_MACRO_DOC: DocArticle = {
  id: "quant-brain-1-macro",
  title: "Brain 1: Pre-Market Macro Selector",
  shortTitle: "Macro Selector Brain",
  description: "Autonomous pre-market institutional surveillance engine: Top-Down 4-Layer Hierarchy, Sector Waves, High-Fuel Compression, and Climax Trap Avoidance.",
  category: "quant",
  readTime: "4 min read",
  content: `
# Brain 1: Pre-Market Macro Selector

**Brain 1 (Macro Selector)** evaluates market structure **before 09:15 AM IST** and emits the active **Focus Universe**.

---

## 1. Pre-Market Selection & Lifecycle Flow

\`\`\`mermaid
flowchart TD
    subgraph PreMarket [08:30 AM: Pre-Market Surveillance]
        T0["Tool 0: Market Macro Sensor<br/>Universe Net Inflow & Sector Waves"]
        T1["Tool 1: Futures Sensor<br/>1D, 3D, 5D Inflows (₹ Cr)"]
        T2["Tool 2: Structure Sensor<br/>CPR Geometry, SMAs, Fuel % (₹300 - ₹7k)"]
        Memory["Load Rolling Memory<br/>(Active Campaigns & Traps)"]
    end

    subgraph AIReasoning [AI Macro Selector Brain]
        Agent["1. Classify Market Regime<br/>2. Isolate Leading vs Lagging Sectors<br/>3. Select High-Fuel Compressed Longs/Shorts<br/>4. Blacklist 0% Fuel Climax Traps"]
    end

    subgraph MarketOpen [09:15 AM: Session Execution]
        DB["Persist to quant.brain_sessions<br/>Decisions + Raw Sensory Features"]
        WarRoom["War Room Cockpit UI (/macro)<br/>Displays Selected Focus Stocks"]
    end

    subgraph PostMarket [15:35 PM: EOD Forensic Review]
        T3["Tool 3: Review Tool<br/>Extracts Actual MFE & Outcomes"]
        ForensicLab["AI Forensic Review<br/>Update quant.brain_memory"]
    end

    T0 --> Agent
    T1 --> Agent
    T2 --> Agent
    Memory --> Agent
    Agent --> DB
    DB --> WarRoom
    WarRoom --> T3
    T3 --> ForensicLab
\`\`\`

---

## 2. Sensory Measurement Tools

### Tool 0: Market Macro Sensor (\`market_macro_sensor.py\`)
- Quantifies universe-wide net cash inflows ($₹\\text{ Cr}$) and advance/decline breadth.
- Aggregates and ranks all sectors by net 1D/3D institutional flows.

### Tool 1: Futures Capital Inflow (\`futures_sensor.py\`)
- Quantifies institutional positioning across 1-day, 3-day, and 5-day lookbacks:
$$\\text{Inflow} = \\frac{\\Delta \\text{Open Interest} \\times \\text{Future VWAP}}{\\text{Lot Size}}$$

### Tool 2: Structural Geometry & Fuel (\`structure_sensor.py\`)
- **Daily CPR Width %**: $\\frac{|\\text{TC} - \\text{BC}|}{\\text{Pivot}} \\times 100$.
- **Macro Fuel %**: Percentage remaining range before 20-day Average Daily Range (ADR) exhaustion.
- **Price Universe Filter**: Strictly ₹300 to ₹7,000 INR.

### Tool 3: EOD Forensic Reviewer (\`review_tool.py\`)
- Extracts ground-truth intraday execution: **Max Intraday Expansion (MFE %)**, **Drawdown %**, **EOD Net %**, and **Trap Fade %**.

---

## 3. Canonical Agent CLI Commands

\`\`\`bash
# 1. Ingest sensory packet and view top candidates:
./.venv/bin/python quant/towncenter.py macro <YYYY-MM-DD>

# 2. Check rolling memory state:
./.venv/bin/python quant/towncenter.py memory --brain macro_selector

# 3. Record decisions directly via CLI:
./.venv/bin/python quant/brains/macro_brain/runner.py <YYYY-MM-DD> --mode record \\
  --regime "REGIME_LABEL" \\
  --leader "LEADING_SECTOR" \\
  --lagger "LAGGING_SECTOR" \\
  --bulls SYMBOL1 SYMBOL2 \\
  --bears SYMBOL3 SYMBOL4 \\
  --traps TRAP1 TRAP2 \\
  --thesis "Cognitive thesis narrative..."

# 4. Review outcomes post-market:
./.venv/bin/python quant/brains/macro_brain/runner.py <PRIOR_DATE> --mode review --outcome-date <OUTCOME_DATE> --forensics "Learnings..."
\`\`\`
`
};
