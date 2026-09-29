# Gidh Intraday — Backend Architecture & Service Guide

`gidh-server` is the core high-performance Go backend service powering Gidh Intraday. It coordinates real-time market data ingestion from Zerodha Kite, live TimescaleDB streaming, Redis pub/sub broadcasting, and low-latency atomic order execution.

---

## 1. System Architecture

```
                       ┌──────────────────────────────┐
                       │  Zerodha Kite Connect APIs   │
                       │  (WebSocket Ticker + REST)   │
                       └──────────────┬───────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │   gidh-server (Go 1.24)   │
                        │                           │
                        │  ┌─────────────────────┐  │
                        │  │ UniverseStreamEngine│  │
                        │  │ (210 Stocks Stream) │  │
                        │  └──────────┬──────────┘  │
                        │             │             │
                        │  ┌──────────▼──────────┐  │
                        │  │   OrderManager      │  │
                        │  │ (State Machine +    │  │
                        │  │  Atomic Execution)  │  │
                        │  └──────────┬──────────┘  │
                        │             │             │
                        │  ┌──────────▼──────────┐  │
                        │  │  WebSocket Hub      │  │
                        │  │  & REST API Server  │  │
                        │  └──────────┬──────────┘  │
                        └─────────────┼─────────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
┌───────────────────────────┐                   ┌───────────────────────────┐
│     TimescaleDB / PG      │                   │      Redis (Key-Value     │
│  - 1m & Daily Candles     │                   │      & Pub/Sub Streams)   │
│  - Intraday Features      │                   │  - Live Order State       │
│  - Instruments Metadata   │                   │  - Position Risk & Lock   │
│  - Quant Brain Sessions   │                   │  - Radar & Sector Feeds   │
└───────────────────────────┘                   └───────────────────────────┘
```

---

## 2. Directory Structure

All Go code is structured strictly under `backend/` complying with the **$\le 150$ lines per file rule**:

```
backend/
├── cmd/
│   ├── gidh-server/            # Unified server composition root & routes
│   │   ├── main.go             # Server initialization, graceful shutdown
│   │   └── routes.go           # HTTP REST & WebSocket endpoint registration
│   ├── gidh-batch/             # EOD backfill and daily feature calculation
│   └── gidh-auth/              # Zerodha Kite login & session token generator
├── internal/
│   ├── api/                    # HTTP REST handlers (radar, candles, orders, positions)
│   ├── broker/                 # Zerodha Kite Connect SDK integration & rate limiting
│   ├── config/                 # Environment variable parsing & validation
│   ├── marketdata/             # Universe live tick engine, minute flusher & feature math
│   ├── ordermanager/           # Atomic order execution, position lifecycle & Redis state
│   ├── store/                  # PostgreSQL / TimescaleDB repository queries
│   ├── universe/               # 210 F&O stock universe & sector classification
│   └── ws/                     # High-concurrency WebSocket hubs (radar, chart, orders, sectors)
```

---

## 3. Core Components

### A. Market Data Engine (`backend/internal/marketdata/`)
- **Universe Streaming**: Connects via WebSocket to Zerodha Kite to stream live quotes for all 210 F&O stocks.
- **Minute Aggregator & Flusher**: Builds 1-minute OHLCV candle bars, calculates VWAP, standard deviation bands ($\pm 1\sigma, \pm 2\sigma$), RVOL, and CLV, flushing directly into TimescaleDB.
- **1Hz Redis Broadcaster**: Broadcasts live market snapshots and sector performance to Redis pub/sub topics (`gidh:radar`, `gidh:sectors`).

### B. Order Manager (`backend/internal/ordermanager/`)
- **Direct Live Execution**: Sends orders directly to Zerodha Kite with leverage calculation (5x margin).
- **Atomic State Transitions**: All order state changes (`PENDING` $\rightarrow$ `SUBMITTING` $\rightarrow$ `SUBMITTED` $\rightarrow$ `FILLED` $\rightarrow$ `CLOSED`) execute via Lua scripts in Redis to guarantee zero race conditions.
- **Automatic Trailing & Risk Protection**: Enforces 1.0% Fixed MAE stop loss and 2:1 R:R target with dynamic MFE trailing and circuit breakers.
- **Reconciliation Engine**: Continuously syncs active positions and orders against Zerodha Kite broker state.

### C. WebSocket Streaming Hub (`backend/internal/ws/`)
- `/v1/stream/radar`: Real-time 210-stock radar with VWAP distance, RVOL, and day rank.
- `/v1/stream/chart`: Real-time 1-minute candles and VWAP bands for individual instruments.
- `/v1/stream/orders`: Live updates on orders, fills, and position PnL.
- `/v1/stream/sectors`: Real-time sector-level performance and breadth.

---

## 4. Key Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/healthz` | Service health status check |
| `GET` | `/api/market/status` | Current market status (open/closed, session date) |
| `GET` | `/api/market/snapshot` | Full 210-stock market snapshot with features |
| `GET` | `/api/market/candles` | Historical and intraday candles for a symbol |
| `GET` | `/api/trading/positions` | Active positions with live PnL and MFE |
| `GET` | `/api/trading/closed-positions` | Closed trades history for the session |
| `GET` | `/api/trading/orders` | Current orders and their execution status |
| `POST` | `/api/trading/orders` | Place a new market/limit managed order |
| `DELETE`| `/api/trading/orders/{id}` | Cancel a pending managed order |
| `POST` | `/api/trading/positions/{symbol}/square-off` | Instantly square off an active position |
| `GET` | `/api/trading/risk-state` | Current risk circuit breaker & kill switch state |
| `POST` | `/api/trading/risk-state/reset` | Reset triggered risk circuit breakers |

---

## 5. Development & Running

### Prerequisites
- Go 1.24+
- PostgreSQL 16+ with TimescaleDB
- Redis 7+

### Environment Configuration (`.env`)
```bash
PORT=8080
DATABASE_URL=postgres://postgres:postgres@localhost:5432/gidh_intraday?sslmode=disable
REDIS_ADDR=localhost:6379
KITE_API_KEY=your_kite_api_key
KITE_ACCESS_TOKEN=your_kite_access_token
```

### Build & Test Commands
```bash
# Run tests
cd backend && go test -count=1 ./...

# Build binary
make build
# or directly:
cd backend && go build -o bin/gidh-server ./cmd/gidh-server

# Run backend
./backend/bin/gidh-server
```
