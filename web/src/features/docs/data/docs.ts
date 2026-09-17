export interface DocArticle {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  category: "quant" | "backend";
  readTime: string;
  content: string;
}

export const ALL_DOCS: DocArticle[] = [
  // ==========================================
  // SECTION 1: QUANT AI COGNITIVE BRAINS (3 Docs)
  // ==========================================
  {
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
        T1["Tool 1: Futures Sensor<br/>(OI, Inflows, Price Moves)"]
        T2["Tool 2: Structure Sensor<br/>(CPR Geometry, Fuel, SMAs)"]
        T3["Tool 3: Review Sensor<br/>(Execution MFE, Drawdowns)"]
    end

    subgraph IntelligenceLayer [AI Cognitive Reasoning Brain]
        Reasoning["AI Reasoning Engine<br/>• Evaluates Institutional Flow<br/>• Detects Exhaustion Traps<br/>• Synthesizes Focus Universe"]
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

## 2. Core Operating Principles

### A. No Hardcoded Trading Rules in Tools
- Python sensory tools (\`futures_sensor.py\`, \`structure_sensor.py\`, \`review_tool.py\`) extract pure, high-dimensional quantitative measurements from TimescaleDB.
- Tools contain **zero \`if/else\` trading heuristics**.
- **The AI Agent** evaluates the raw multi-variable matrix, contextualizes market regimes, detects exhaustion traps, and synthesizes decisions.

### B. The 3-Phase Cognitive Lifecycle
- Every trading brain executes the same invariant loop:
$$\\text{Sensory Ingestion (Tools)} \\longrightarrow \\text{AI Decision Persistence} \\longrightarrow \\text{EOD Forensic Review \\& Memory}$$
- **Continuous Rolling Memory**: Yesterday's EOD execution forensics immediately feed into today's pre-market reasoning.

---

## 3. Directory Hierarchy

\`\`\`text
quant/
├── base/                           # DB connections & sizing constants
│   ├── db.py                       # TimescaleDB connection pool
│   └── models.py                   # Shared dataclasses
│
├── brains/                         # Autonomous Cognitive Trading Brains
│   ├── base_brain.py               # Abstract BaseBrain contract
│   │
│   ├── macro_brain/                # 🧠 Brain 1: Pre-Market Macro Selector
│   │   ├── tools/
│   │   │   ├── futures_sensor.py   # Tool 1: Raw Futures Dynamics (OI, Inflows)
│   │   │   ├── structure_sensor.py # Tool 2: Daily Features (CPR, SMAs, Fuel)
│   │   │   └── review_tool.py      # Tool 3: EOD Outcome & Forensic Reviewer
│   │   └── dispatcher.py           # Ingestion bridge & universal JSONB persistence
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

---

## 4. Universal 2-Table JSONB Database Schema

All brains write to and read from **2 universal tables** in PostgreSQL without schema migrations:

### \`quant.brain_sessions\` (Session Decisions & Outcomes)
| Column | Type | Description |
| :--- | :--- | :--- |
| \`session_date\` | \`DATE\` | Trading session date (PK) |
| \`brain_id\` | \`VARCHAR\` | Brain identifier (e.g. \`macro_selector\`, \`micro_vwap\`) (PK) |
| \`decisions\` | \`JSONB\` | Focus picks, entry orders, stops, profit targets |
| \`sensory_features\` | \`JSONB\` | Raw multidimensional state snapshot at decision time |
| \`ai_thesis\` | \`TEXT\` | AI qualitative reasoning and setup thesis |
| \`outcomes\` | \`JSONB\` | Post-market execution results (Gap %, MFE, Drawdown, Net %) |
| \`forensics\` | \`TEXT\` | AI post-market evolutionary reflection |

### \`quant.brain_memory\` (Persistent Rolling Memory)
| Column | Type | Description |
| :--- | :--- | :--- |
| \`brain_id\` | \`VARCHAR\` | Primary key identifying the brain |
| \`memory_state\` | \`JSONB\` | Rolling multi-day memory buffer, campaign tracker, and learned patterns |
| \`updated_at\` | \`TIMESTAMPTZ\` | Timestamp of last cognitive update |
`
  },
  {
    id: "quant-brain-protocol",
    title: "The BaseBrain Contract & Developer Guide",
    shortTitle: "BaseBrain Contract",
    description: "Specification for implementing new trading brains in 3 simple steps under quant/brains/.",
    category: "quant",
    readTime: "3 min read",
    content: `
# The BaseBrain Contract & Developer Guide

Every trading brain (Macro Selector, Micro VWAP, Micro ORB, Pullback Defense, Risk Governor) inherits from \`BaseBrain\` in \`quant/brains/base_brain.py\`.

---

## 1. Brain Implementation Protocol

\`\`\`mermaid
flowchart TD
    subgraph Step1 [Step 1: Create Directory]
        D1["quant/brains/micro_name/<br/>├── tools/<br/>│   ├── custom_sensor.py<br/>│   └── review_sensor.py<br/>└── dispatcher.py"]
    end

    subgraph Step2 [Step 2: Implement BaseBrain]
        C1["class CustomBrain(BaseBrain):<br/>• __init__('micro_name')<br/>• build_sensory_packet()<br/>• Inherits .record_decision()<br/>• Inherits .record_eod_forensics()"]
    end

    subgraph Step3 [Step 3: Register in Towncenter]
        T1["towncenter.py<br/>Add CLI subcommand"]
    end

    Step1 --> Step2
    Step2 --> Step3
\`\`\`

---

## 2. Abstract BaseBrain Contract

\`\`\`python
from abc import ABC, abstractmethod

class BaseBrain(ABC):
    def __init__(self, brain_id: str):
        self.brain_id = brain_id

    @abstractmethod
    def build_sensory_packet(self, session_date: str, conn=None) -> dict:
        """Extracts raw tool measurements. Zero heuristic rules."""
        pass

    def record_decision(self, session_date: str, decisions: dict, sensory_features: dict, ai_thesis: str, conn=None):
        """Universal persistence to quant.brain_sessions"""
        ...

    def record_eod_forensics(self, session_date: str, outcomes_payload: dict, forensics_summary: str, conn=None):
        """Universal persistence for EOD review & syncs quant.brain_memory"""
        ...

    def get_rolling_memory(self, conn=None) -> dict:
        """Loads persistent rolling memory for this brain"""
        ...
\`\`\`

---

## 3. Building a New Brain in 3 Steps

### Step 1: Create the Brain Directory
\`\`\`text
quant/brains/micro_vwap/
├── tools/
│   ├── vwap_sensor.py      # Raw 1-min VWAP distances & volume profile
│   └── execution_sensor.py # Fill & slippage metrics
└── dispatcher.py           # Inherits from BaseBrain("micro_vwap")
\`\`\`

### Step 2: Implement \`dispatcher.py\`
\`\`\`python
from quant.brains.base_brain import BaseBrain
from quant.brains.micro_vwap.tools.vwap_sensor import extract_vwap_state

class MicroVwapBrain(BaseBrain):
    def __init__(self):
        super().__init__(brain_id="micro_vwap")

    def build_sensory_packet(self, session_date: str, conn=None) -> dict:
        return {
            "session_date": session_date,
            "brain_id": self.brain_id,
            "rolling_memory": self.get_rolling_memory(conn=conn),
            "vwap_state": extract_vwap_state(session_date, conn=conn)
        }
\`\`\`

### Step 3: Register in \`quant/towncenter.py\`
- Add a subcommand to allow CLI execution and memory inspection.
`
  },
  {
    id: "quant-brain-1-macro",
    title: "Brain 1: Pre-Market Macro Selector",
    shortTitle: "Macro Selector Brain",
    description: "Autonomous pre-market institutional surveillance engine: Futures Capital Inflow, Daily CPR Geometry, Macro Fuel %, and Trap Avoidance.",
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
        T1["Tool 1: Futures Sensor<br/>1D, 3D, 5D Inflows (₹ Cr)"]
        T2["Tool 2: Structure Sensor<br/>CPR Geometry, SMAs, Fuel %"]
        Memory["Load Rolling Memory<br/>(3-Day Traps & Regime)"]
    end

    subgraph AIReasoning [AI Macro Selector Brain]
        Agent["Synthesize Institutional Flow<br/>Filter Volume Climax Traps<br/>Select Top Long/Short Universe"]
    end

    subgraph MarketOpen [09:15 AM: Session Execution]
        DB["Persist to quant.brain_sessions<br/>Decisions + Raw Sensory Features"]
        WarRoom["War Room Cockpit UI (/macro)<br/>Displays Selected Focus Stocks"]
    end

    subgraph PostMarket [15:35 PM: EOD Forensic Review]
        T3["Tool 3: Review Tool<br/>Extracts Actual MFE & Outcomes"]
        ForensicLab["AI Forensic Review<br/>Update Rolling Memory State"]
    end

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

### Tool 1: Futures Capital Inflow (\`futures_sensor.py\`)
- Quantifies institutional positioning across 1-day, 3-day, and 5-day lookbacks:
$$\\text{Inflow} = \\frac{\\Delta \\text{Open Interest} \\times \\text{Future VWAP}}{\\text{Lot Size}}$$
- Flags institutional build-ups (**Long Build**, **Short Build**, **Long Unwinding**, **Short Covering**).

### Tool 2: Structural Geometry & Fuel (\`structure_sensor.py\`)
- **Daily CPR Width %**: $\\frac{|\\text{TC} - \\text{BC}|}{\\text{Pivot}} \\times 100$.
- **Macro Fuel %**: Percentage distance to nearest daily hurdle (Previous Day High/Low, Weekly High/Low, Daily 20/50/200 SMA).

### Tool 3: EOD Forensic Reviewer (\`review_tool.py\`)
- Extracts ground-truth intraday execution: **Max Favorable Excursion (MFE %)**, **Drawdown %**, and **Intraday Net Move %**.
`
  },

  // ==========================================
  // SECTION 2: BACKEND STREAMING & DATA PIPELINE (5 Docs)
  // ==========================================
  {
    id: "backend-architecture",
    title: "Real-Time Streaming Pipeline",
    shortTitle: "Streaming Pipeline",
    description: "End-to-end streaming architecture: sub-second Kite tick ingestion, atomic in-memory buffering, 1Hz Redis state broadcast, and TimescaleDB hypertable flushing.",
    category: "backend",
    readTime: "4 min read",
    content: `
# Real-Time Streaming Pipeline

The **Gidh Intraday Streaming Engine** is an in-memory, deterministic Go service engineered for high-throughput, zero-allocation tick ingestion across 210 F&O universe stocks.

---

## 1. Streaming Pipeline Topology

\`\`\`mermaid
flowchart TD
    subgraph Broker [Zerodha Kite Connect]
        KT["Kite Ticker WebSocket<br/>(ModeQuote 210 Stocks)"]
    end

    subgraph StreamingEngine [Go Universe Streaming Engine]
        Injest["handleTick()<br/>Sub-Second Ingestion"]
        State["InstrumentState<br/>Atomic In-Memory Buffer"]
        Live1Hz["1Hz Live Snapshot<br/>Calculator"]
        MinFlusher["1-Min Flusher<br/>(:00 Boundary)"]
    end

    subgraph CacheLayer [Redis State Layer]
        RActive["gidh:live:active<br/>(3s TTL Heartbeat)"]
        RSnapshot["gidh:live:snapshot<br/>(1Hz Cached Snapshot)"]
        RStream["gidh:live:stream:radar<br/>(1Hz Realtime PubSub)"]
    end

    subgraph StorageLayer [TimescaleDB Hypertables]
        Candles["market.cash_candles_1m<br/>(1m OHLCV Bars)"]
        Features["market.intraday_features_1m<br/>(47 Statistical Features)"]
    end

    subgraph EdgeHub [Edge GraphQL & WS Hub]
        EdgeWS["1Hz Isolated<br/>WebSocket Hub"]
        EdgeQL["GraphQL Snapshot<br/>Resolver"]
    end

    subgraph WebClient [Frontend War Room]
        UI["Radar, Macro &<br/>Charts Viewers"]
    end

    KT --> Injest
    Injest --> State
    State --> Live1Hz
    Live1Hz --> RActive
    Live1Hz --> RSnapshot
    Live1Hz --> RStream

    State --> MinFlusher
    MinFlusher --> Candles
    MinFlusher --> Features

    RActive -.-> EdgeQL
    RSnapshot -.-> EdgeQL
    RStream --> EdgeWS

    EdgeQL --> UI
    EdgeWS --> UI
\`\`\`

---

## 2. Streaming Lifecycle & Responsibilities

| Component | Responsibility | Frequency / SLA |
| :--- | :--- | :--- |
| \`Kite Ticker\` | Pushes binary tick packets for 210 F&O stock tokens in \`ModeQuote\`. | Sub-second real-time |
| \`InstrumentState\` | Thread-safe atomic struct updating session highs, lows, turnover, and volume. | Zero allocation, sub-millisecond |
| \`1Hz Live Engine\` | Calculates instant VWAP, CLV, RVOL, and universe breadth percentage. | Exactly 1Hz (1,000ms timer) |
| \`Redis State Store\` | Broadcasts 1Hz heartbeat (\`gidh:live:active\`) and JSON market snapshots. | 3s TTL heartbeat |
| \`Minute Flusher\` | Commits completed 1m OHLCV candles and 47 statistical features to TimescaleDB. | Every 60s at \`:00\` boundary |
| \`Edge Hub\` | Subscribes to Redis PubSub and multiplexes 1Hz deltas to active browser WebSockets. | Sub-10ms delivery |

---

## 3. Streaming Engine State Machine

### A. 09:10:00 IST (In-Memory Hydration & WebSocket Warmup)
- \`UniverseStreamEngine\` detects market warmup window (550 mins from midnight).
- Loads pre-calculated baseline metrics (ATR-14, ADR-20, Camarilla Pivots, Expected Volume curves) computed by the EOD batch job.
- Connects persistent WebSocket to Zerodha Kite Ticker in \`ModeQuote\`.
- Subscribes to all 210 universe tokens and waits for continuous market open.
- Sets Redis key \`gidh:live:active\` (3s heartbeat) to signal the Edge layer that live streaming is ready.
`
  },
  {
    id: "backend-auth-service",
    title: "Zerodha Kite Automated Auth & TOTP Login",
    shortTitle: "Automated Kite Auth",
    description: "Automated daily TOTP authentication, session cookie extraction, and 24-hour access token provisioning.",
    category: "backend",
    readTime: "2 min read",
    content: `
# Zerodha Kite Automated Auth & TOTP Login

Located in \`backend/cmd/gidh-auth\`, this service provides headless automated Zerodha Kite login using TOTP multi-factor authentication.

---

## 1. Authentication Handshake Pipeline

\`\`\`mermaid
flowchart TD
    Seed["Base32 TOTP Secret<br/>(KITE_TOTP_SECRET)"]
    OTP["Generate 6-Digit TOTP<br/>(pquerna/otp)"]
    Login["Kite Login API Handshake<br/>(https://kite.zerodha.com/api/login)"]
    Token["Exchange Request Token<br/>(api_key + api_secret)"]
    Env[".env Configuration File<br/>(Save 24-Hour KITE_ACCESS_TOKEN)"]

    Seed --> OTP
    OTP --> Login
    Login --> Token
    Token --> Env
\`\`\`

---

## 2. Authentication Modes

### A. Headless Automated Flow (Production & CI)
When \`KITE_USER_ID\`, \`KITE_PASSWORD\`, and \`KITE_TOTP_SECRET\` exist in the environment:
- Generates 6-digit TOTP code using \`pquerna/otp\`.
- Emulates Zerodha login handshake against \`https://kite.zerodha.com/api/login\`.
- Exchanges \`request_token\` for a valid 24-hour \`access_token\`.
- Writes the updated token directly to the \`.env\` configuration file.

### B. Interactive Browser Flow (Manual Fallback)
If automated credentials are absent or fail:
- Prints the Zerodha Connect login URL: \`https://kite.zerodha.com/connect/login?v=3&api_key=...\`
- User completes browser login and pastes the redirected \`request_token\`.
- \`gidh-auth\` generates and writes the active \`access_token\`.

---

## 3. CLI Usage

\`\`\`bash
# Run automated/interactive login
go run ./backend/cmd/gidh-auth

# Or pass a pre-acquired request token directly
go run ./backend/cmd/gidh-auth <request_token>
\`\`\`
`
  },
  {
    id: "backend-live-engine",
    title: "Live 1Hz Engine & Redis Protocol",
    shortTitle: "1Hz Live Engine",
    description: "How sub-second ticks are aggregated in-memory and broadcast via Redis PubSub for UI delivery.",
    category: "backend",
    readTime: "3 min read",
    content: `
# Live 1Hz Engine & Redis Protocol

To maintain sub-10ms UI updates across hundreds of concurrent instruments without overloading PostgreSQL, the backend uses an **in-memory atomic state aggregator** coupled with **Redis state caching**.

---

## 1. Tick Ingestion & State Pipeline

\`\`\`mermaid
flowchart LR
    Tick["Zerodha Tick<br/>(ModeQuote)"]
    Handler["handleTick()<br/>Thread-Safe Update"]
    Mem["InstrumentState<br/>In-Memory Buffer"]
    Calc["LiveSnapshot()<br/>1Hz Calculations"]
    RStore["Redis Cache &<br/>PubSub Channels"]

    Tick --> Handler
    Handler --> Mem
    Mem --> Calc
    Calc --> RStore
\`\`\`

---

## 2. Engine Processing Steps

### A. Atomic Sub-Second Ingestion
- Each tick updates the stock's \`MinHigh\`, \`MinLow\`, \`MinClose\`, \`MinVolume\`, and cumulative turnover in \`InstrumentState\`.
- Mutex locks are scoped at the fine-grained engine level to eliminate latency spikes.

### B. 1Hz Snapshot Construction
Every second, \`LiveSnapshot()\` derives real-time metrics across all 210 universe stocks:
- **VWAP**: \`CumTurnover / CumVolume\`
- **VWAP Distance %**: \`((Price - VWAP) / VWAP) * 100\`
- **CLV (Close Location Value)**: \`(Price - SessionLow) / (SessionHigh - SessionLow)\`
- **RVOL (Relative Volume)**: \`CumVolume / ExpectedCumVolumeAtCurrentMinute\`
- **Market Breadth**: \`% of universe trading strictly above intraday VWAP\`
- **Sector Resonance**: Aggregated % change, RVOL, and breadth per sector.

---

## 3. Redis Key Protocol

| Redis Key | Type | TTL | Purpose |
| :--- | :--- | :--- | :--- |
| \`gidh:live:active\` | String (\`"1"\`) | 3s | **Live Heartbeat**: If key exists, backend is actively streaming live market ticks. |
| \`gidh:live:session_date\` | String | Persistent | Current active trading session date (\`YYYY-MM-DD\`). |
| \`gidh:live:snapshot\` | String (JSON) | 5s | Cached full market snapshot for instant Edge GraphQL resolution. |
| \`gidh:live:stream:radar\` | Pub/Sub | Realtime | 1Hz broadcast channel pushing delta updates to WebSockets. |
`
  },
  {
    id: "backend-feature-calculator",
    title: "47-Feature Intraday Mathematical Core",
    shortTitle: "47-Feature Math Core",
    description: "Detailed mathematical formulas for the 47 quant features computed at every 1-minute candle close.",
    category: "backend",
    readTime: "5 min read",
    content: `
# 47-Feature Intraday Mathematical Core

At every completed minute (\`:00\` seconds), the backend flushes 1-minute candles and computes **47 quantitative features** stored in \`market.intraday_features_1m\`.

---

## 1. Feature Computation Pipeline

\`\`\`mermaid
flowchart TD
    Tick["1-Minute Completed Candle<br/>(:00 Second Boundary)"]
    Calc["IntradayFeatureEngine<br/>Parallel Vectorized Computation"]
    
    subgraph MathFeatures [47 Mathematical Features]
        F1["VWAP & Standard Deviation Bands (±1σ, ±2σ)"]
        F2["Price Action Geometry (CLV, Wick Ratios, Body Ratio)"]
        F3["Relative Volume (RVOL) & Rolling Log Volatility"]
        F4["Volatility & ADR Fuel Exhaustion"]
        F5["Opening Range Dynamics (OR15, OR30 Boundaries)"]
    end

    DB["TimescaleDB Hypertable<br/>market.intraday_features_1m"]

    Tick --> Calc
    Calc --> MathFeatures
    MathFeatures --> DB
\`\`\`

---

## 2. Feature Categories & Mathematical Formulas

### A. Volume-Weighted Price & Standard Deviation Bands
- **Session VWAP**:
  $$\\text{VWAP} = \\frac{\\sum (\\text{Price} \\times \\text{Volume})}{\\sum \\text{Volume}}$$
- **VWAP Standard Deviation ($\\sigma$)**:
  $$\\sigma = \\sqrt{\\max\\left(0, \\frac{\\sum (\\text{Price}^2 \\times \\text{Volume})}{\\sum \\text{Volume}} - \\text{VWAP}^2\\right)}$$
- **VWAP Upper & Lower Bands**: $\\text{VWAP} \\pm 1\\sigma, \\text{VWAP} \\pm 2\\sigma$.

### B. Price Action & Location
- **CLV (Close Location Value)**:
  $$\\text{CLV} = \\frac{(\\text{Close} - \\text{Low}) - (\\text{High} - \\text{Close})}{\\text{High} - \\text{Low}} \\in [-1.0, +1.0]$$
- **Bar Body Ratio**: $\\frac{|\\text{Close} - \\text{Open}|}{\\text{High} - \\text{Low}}$.

### C. Institutional Relative Volume (RVOL)
- **Time-Decayed Expected Volume Profile**: Pre-calculated baseline curve based on median 30-day volume at minute $t$.
- **RVOL**:
  $$\\text{RVOL}_t = \\frac{\\text{CumulativeVolume}_t}{\\text{ExpectedCumulativeVolume}_t}$$

### D. Volatility & Fuel Exhaustion
- **Session Range / ATR(14)**: Current session range divided by 14-day Daily ATR.
- **ADR Fuel Used**: % of 20-day Average Daily Range consumed.
`
  },
  {
    id: "backend-eod-batch",
    title: "EOD Pipeline & Data Integrity Jobs",
    shortTitle: "EOD Integrity Jobs",
    description: "Automated end-of-day data verification, Kite repair backfills, and daily baseline publishing.",
    category: "backend",
    readTime: "3 min read",
    content: `
# EOD Pipeline & Data Integrity Jobs

Run via \`backend/cmd/gidh-batch\`, the EOD pipeline guarantees 100% data completeness across all cash and futures instruments.

---

## 1. EOD Execution Pipeline

\`\`\`mermaid
flowchart TD
    Step1["1. Universe Verification<br/>(210 Active F&O Stocks)"]
    Step2["2. Candle Completeness Scan<br/>(TimescaleDB 1m Hypertable)"]
    Step3["3. Kite API Auto-Repair<br/>(Backfill Missing 1m Bars)"]
    Step4["4. Daily Baseline Publishing<br/>(ATR-14, ADR-20, Pivots)"]
    Step5["5. Redis Cache Invalidation<br/>(Warm Replay Snapshots)"]

    Step1 --> Step2
    Step2 --> Step3
    Step3 --> Step4
    Step4 --> Step5
\`\`\`

---

## 2. Pipeline Execution Steps

### A. Universe Verification
- Confirms all 210 active F&O instruments are mapped and active in \`market.instruments\`.

### B. Candle Completeness Scan
- Queries TimescaleDB for missing 1m bars ($< 350$ candles between 09:15 and 15:30 IST).

### C. Kite API Auto-Repair
- If any stock has dropped ticks due to network blips, the batch engine automatically calls Zerodha Kite Historical API and backfills missing bars into \`market.cash_candles_1m\` and \`market.future_candles_1m\`.

### D. Daily Baseline Publishing (\`daily.Publish\`)
- Calculates baseline metrics for the next trading day:
  - 14-day True Range & ATR.
  - 20-day Average Daily Range (ADR).
  - 30-day cumulative expected volume profiles.
  - Camarilla pivots (H1..H5, L1..L5) and Classic pivots.

### E. Cache Optimization
- Flushes stale Redis replay keys and warms up pre-calculated historical snapshots.
`
  }
];

export const BACKEND_DOCS = ALL_DOCS;
