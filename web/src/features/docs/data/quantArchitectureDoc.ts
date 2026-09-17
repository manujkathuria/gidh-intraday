import { DocArticle } from "./types";

export const QUANT_ARCHITECTURE_DOC: DocArticle = {
  id: "quant-architecture",
  title: "Quant System & Cognitive Architecture",
  shortTitle: "Cognitive Architecture",
  description: "Core operating philosophy: AI as the reasoning brain, Python tools as sensory receptors, and the BaseBrain contract.",
  category: "quant",
  readTime: "4 min read",
  content: `
# Quant System & Cognitive Architecture

The **GIDH Quant Architecture** is engineered around a single fundamental invariant: **AI is the reasoning brain; Python tools are the sensory body**.

---

## 1. Cognitive Architecture Topology

\`\`\`mermaid
flowchart TD
    subgraph SensoryLayer [Sensory Tools Layer]
        T0["Tool 0: Market Macro Sensor<br/>(Universe Inflows, Breadth, Sector Waves)"]
        T1["Tool 1: Futures Sensor<br/>(OI, Inflows, Price Moves)"]
        T2["Tool 2: Structure Sensor<br/>(CPR Geometry, Fuel, SMAs, Price Filter)"]
        T3["Tool 3: Review Sensor<br/>(Execution MFE, Drawdown, Trap Fades)"]
    end

    subgraph IntelligenceLayer [AI Cognitive Reasoning Brain]
        Reasoning["AI Reasoning Engine<br/>• Top-Down 4-Layer Hierarchy<br/>• Sector Capital Waves<br/>• High-Fuel Alpha Selection<br/>• 0% Climax Trap Filter"]
        Forensics["EOD Forensic Lab<br/>• Post-Market Reflection<br/>• Win Rate & MFE Forensics"]
    end

    subgraph StorageLayer [PostgreSQL quant Universal Schema]
        Sessions["quant.brain_sessions<br/>(Decisions, Features, Outcomes)"]
        Memory["quant.brain_memory<br/>(Persistent Rolling Memory)"]
    end

    subgraph ExecutionLayer [Live War Room & Execution]
        Micro["Micro Brains<br/>(1-Min Order Flow Live MIS)"]
        UI["Web Cockpit UI<br/>(/macro, /radar)"]
    end

    T0 --> Reasoning
    T1 --> Reasoning
    T2 --> Reasoning
    Memory -.->|Feeds Prior Context| Reasoning

    Reasoning --> Sessions
    Sessions --> Micro
    Sessions --> UI

    Micro --> T3
    T3 --> Forensics
    Forensics --> Sessions
    Forensics --> Memory
\`\`\`

---

## 2. Top-Down 4-Layer Market Macro Protocol

1. **Layer 1: Broad Market Breadth & Net Inflow (₹ Cr)**: Classify broad market regime.
2. **Layer 2: Sector Capital Waves**: Rank sectors by net 1D/3D institutional inflows to isolate leading accumulation vs bleeding distribution sectors.
3. **Layer 3: Alpha Stock Selection (Universe: ₹300 – ₹7,000)**: Select 2-4 high-fuel longs in leading sectors, 2-3 high-fuel shorts in lagging sectors, and blacklist 0% fuel climax traps.
4. **Layer 4: Distilled Cognitive Memory**: Store actionable bullet points (\`market_regime\`, \`active_campaigns\`, \`learned_rules\`, \`traps_to_avoid\`) in \`quant.brain_memory\`.

---

## 3. Directory Hierarchy

\`\`\`text
quant/
├── base/                           # DB connections & sizing constants
│   ├── db.py                       # TimescaleDB connection pool
│   ├── models.py                   # Shared dataclasses
│   └── sectors.py                  # Canonical sector classification (210 active F&O instruments)
│
├── brains/                         # Autonomous Cognitive Trading Brains
│   ├── base_brain.py               # Abstract BaseBrain contract
│   │
│   ├── macro_brain/                # 🧠 Brain 1: Pre-Market Macro Selector
│   │   ├── tools/
│   │   │   ├── market_macro_sensor.py # Tool 0: Universe Net Inflows, Breadth, & Sector Waves
│   │   │   ├── futures_sensor.py      # Tool 1: 1D/3D/5D Futures Dynamics (OI, Inflows)
│   │   │   ├── structure_sensor.py    # Tool 2: Daily Structural Geometry (CPR, SMAs, Fuel)
│   │   │   └── review_tool.py         # Tool 3: EOD Outcome & Forensic Reviewer
│   │   ├── types.py                # Typed dataclasses (MacroCandidate, MacroDecisions, MacroMemoryState)
│   │   ├── dispatcher.py           # Ingestion bridge & universal JSONB persistence
│   │   ├── runner.py               # CLI runner tool for record & review modes
│   │   └── PROMPT.md               # Lean 35-line protocol prompt for peer agents
│   │
│   └── micro_brains/               # ⚡ Micro Brains: Intraday 1M Live Execution
│
├── ai-docs/                        # Agent Context & Documentation
│   ├── ARCHITECTURE.md
│   ├── BRAIN_PROTOCOL.md
│   └── BRAIN_1_MACRO_SELECTOR.md
│
└── towncenter.py                   # Master CLI Cockpit Interface
\`\`\`
`
};
