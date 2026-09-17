export interface DocArticle {
  id: string;
  title: string;
  description: string;
  category: "backend" | "edge" | "quant" | "data";
  readTime: string;
  content: string;
}

export const BACKEND_DOCS: DocArticle[] = [
  {
    id: "backend-architecture",
    title: "Real-Time Streaming Pipeline",
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

## 2. Streaming Lifecycle & Component Responsibilities

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

1. **09:10:00 IST (In-Memory Hydration & WebSocket Warmup)**:
   - \`UniverseStreamEngine\` detects market warmup window (550 mins from midnight).
   - **Loads Pre-Calculated Baselines**: Reads the baseline metrics (Daily ATR-14, ADR-20, Camarilla Pivots, Expected Volume curves) that were **already pre-calculated by the EOD batch job** the previous evening from the database.
   - Connects persistent WebSocket to Zerodha Kite Ticker in \`ModeQuote\`.
   - Subscribes to all 210 universe tokens and waits for continuous market open.
   - Sets Redis key \`gidh:live:active\` (3s heartbeat) to signal the Edge layer that live streaming is ready.
2. **09:15:00 - 15:30:00 IST (Continuous Live Market Ingestion Loop)**:
   - Concurrently processes live incoming continuous ticks and updates \`InstrumentState\` in-memory with zero lock contention.
   - Publishes 1Hz live snapshots and heartbeats to Redis (\`gidh:live:active\`).
   - Flushes completed 1m OHLCV candles and 47 features to TimescaleDB at \`:00\` every minute.
3. **15:30:00 IST (Market Close & Teardown)**:
   - Gracefully disconnects Zerodha Kite Ticker WebSocket stream.
   - Flushes final pending 1-minute candle bars to TimescaleDB.
   - Transitions into dormant state until the next trading session.
`
  },
  {
    id: "backend-auth",
    title: "Broker Authentication (gidh-auth)",
    description: "Automated Zerodha TOTP login service, session token renewal, and environment synchronization.",
    category: "backend",
    readTime: "3 min read",
    content: `
# Broker Authentication (gidh-auth)

The \`gidh-auth\` CLI (\`backend/cmd/gidh-auth\`) automates the daily Zerodha Kite Connect authentication cycle, acquiring valid access tokens for market data streaming and order routing.

---

## 1. Authentication Flows

\`\`\`mermaid
flowchart LR
    Start["gidh-auth CLI<br/>Execution"]
    Check{"Credentials<br/>Available?"}
    TOTP["Automated TOTP<br/>Login Handshake"]
    Browser["Interactive Browser<br/>OAuth Flow"]
    Token["Write Active<br/>KITE_ACCESS_TOKEN"]

    Start --> Check
    Check -->|UserID + TOTP Secret| TOTP
    Check -->|Manual Fallback| Browser
    TOTP --> Token
    Browser --> Token
\`\`\`

### A. Automated TOTP Flow (Headless / Zero Interaction)
When \`KITE_USER_ID\`, \`KITE_PASSWORD\`, and \`KITE_TOTP_SECRET\` exist in the environment:
1. Generates 6-digit TOTP code using \`pquerna/otp\`.
2. Emulates Zerodha login handshake against \`https://kite.zerodha.com/api/login\`.
3. Exchanges \`request_token\` for a valid 24-hour \`access_token\`.
4. Writes the updated token directly to the \`.env\` configuration file.

### B. Interactive Browser Flow (Manual Fallback)
If automated credentials are absent or fail:
1. Prints the Zerodha Connect login URL:
   \`https://kite.zerodha.com/connect/login?v=3&api_key=...\`
2. User completes browser login and pastes the redirected \`request_token\`.
3. \`gidh-auth\` generates and writes the active \`access_token\`.

---

## 2. CLI Usage

\`\`\`bash
# Run automated/interactive login
go run ./backend/cmd/gidh-auth

# Or pass a pre-acquired request token directly
go run ./backend/cmd/gidh-auth <request_token>
\`\`\`

---

## 3. Environment Variables

| Variable | Required | Description |
| :--- | :--- | :--- |
| \`KITE_API_KEY\` | Yes | Zerodha Connect App API Key |
| \`KITE_API_SECRET\` | Yes | Zerodha Connect App API Secret |
| \`KITE_USER_ID\` | Optional | Zerodha 6-character User ID (for automated login) |
| \`KITE_PASSWORD\` | Optional | Broker account password (for automated login) |
| \`KITE_TOTP_SECRET\` | Optional | Base32 TOTP Authenticator seed secret |
| \`KITE_ACCESS_TOKEN\` | Output | Auto-generated 24-hour active session token |
`
  },
  {
    id: "backend-live-engine",
    title: "Live 1Hz Engine & Redis Protocol",
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
    description: "Detailed mathematical formulas for the 47 quant features computed at every 1-minute candle close.",
    category: "backend",
    readTime: "5 min read",
    content: `
# 47-Feature Intraday Mathematical Core

At every completed minute (\`:00\` seconds), the backend flushes 1-minute candles and computes **47 quantitative features** stored in \`market.intraday_features_1m\`.

---

## 1. Feature Categories

### A. Volume-Weighted Price & Standard Deviation Bands
- **Session VWAP**:
  $$\\text{VWAP} = \\frac{\\sum (\\text{Price} \\times \\text{Volume})}{\\sum \\text{Volume}}$$
- **VWAP Standard Deviation ($\\sigma$)**:
  $$\\sigma = \\sqrt{\\max\\left(0, \\frac{\\sum (\\text{Price}^2 \\times \\text{Volume})}{\\sum \\text{Volume}} - \\text{VWAP}^2\\right)}$$
- **VWAP Upper & Lower Bands**: $\\text{VWAP} \\pm 1\\sigma, \\text{VWAP} \\pm 2\\sigma$.
- **VWAP Distance ($\sigma$)**: Normalized z-score of current price relative to VWAP.

### B. Price Action & Location
- **CLV (Close Location Value)**:
  $$\\text{CLV} = \\frac{(\\text{Close} - \\text{Low}) - (\\text{High} - \\text{Close})}{\\text{High} - \\text{Low}} \\in [-1.0, +1.0]$$
- **Upper / Lower Wick Ratio**: Fraction of candle range occupied by upper and lower shadows.
- **Bar Body Ratio**: $\\frac{|\\text{Close} - \\text{Open}|}{\\text{High} - \\text{Low}}$.

### C. Institutional Relative Volume (RVOL)
- **Time-Decayed Expected Volume Profile**: Pre-calculated baseline curve based on the median 30-day volume at minute $t$.
- **RVOL**:
  $$\\text{RVOL}_t = \\frac{\\text{CumulativeVolume}_t}{\\text{ExpectedCumulativeVolume}_t}$$
- **Rolling Log Return Volatilities**: $\\text{rVol}_5$, $\\text{rVol}_{15}$, $\\text{rVol}_{30}$ computed from 1-min log returns.

### D. Volatility & Fuel Exhaustion
- **Session Range / ATR(14)**: Current session range divided by 14-day Daily ATR.
- **ADR Fuel Used**: % of 20-day Average Daily Range consumed.

### E. Opening Range Dynamics (ORB)
- **OR15 High / Low**: 15-minute Opening Range boundary (frozen after 09:30 IST).
- **OR30 High / Low**: 30-minute Opening Range boundary (frozen after 09:45 IST).
`
  },
  {
    id: "backend-eod-batch",
    title: "EOD Pipeline & Data Integrity Jobs",
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
