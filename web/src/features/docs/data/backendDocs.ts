import { DocArticle } from "./types";

export const BACKEND_DOCS: DocArticle[] = [
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

## 2. Redis Key Protocol

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

## 1. Feature Categories & Mathematical Formulas

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
- **RVOL**: $\\text{RVOL}_t = \\frac{\\text{CumulativeVolume}_t}{\\text{ExpectedCumulativeVolume}_t}$.
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
`
  }
];
