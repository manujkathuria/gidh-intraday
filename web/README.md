# Gidh Intraday — Web UI

The `web/` directory contains the modern Next.js 16 web terminal for Gidh Intraday. It connects directly to `gidh-server` over REST and WebSockets for real-time market radar scanning, interactive chart trading, and live MIS position management.

---

## Features

- **210-Stock Live Radar**: Real-time intraday radar ranking with VWAP distance, RVOL, Day Rank, and CLV metrics.
- **Interactive Candlestick Studio**: Lightweight-charts canvas featuring intraday VWAP $\pm 1\sigma / \pm 2\sigma$ bands, PDH/PDL levels, and draggable Stop Loss / Target Price / Limit lines.
- **Live Positions & Risk Console**: Real-time position tracking with MFE/MAE excursion tracking, 1-click square-off, and circuit breaker tripwire monitoring.
- **Sector Matrix**: Intraday sector rotation heatmap and VWAP breadth tracking across all NSE sectors.

---

## Tech Stack & Standards

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript (strict mode)
- **State Management**: Zustand stores with 1Hz throttled WebSocket streaming
- **Charting**: Lightweight-Charts v5 (`ResizeObserver` responsive canvas)
- **Styling**: Tailwind CSS + Custom Dark/Light theme system
- **Architecture**: Modular feature-based structure where all source files strictly adhere to **$\le 150$ physical lines per file**.

---

## Directory Structure

```
src/
├── app/                    # Next.js App Router routes (/, /chart, /positions, /sectors)
├── features/               # Feature modules (header, radar, chart, positions, sectors)
├── stores/                 # Zustand global state (marketStore, liveOrderStore)
└── lib/                    # Typed API client, WebSocket handlers, and models
```

---

## Getting Started

### 1. Environment Configuration

Create or update `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

### 2. Install & Run

```bash
# Install dependencies
npm install

# Start Next.js development server on :3000
npm run dev

# Build production bundle
npm run build
```

---

## Documentation

For an in-depth architectural breakdown and component contracts, refer to [docs/FRONTEND.md](../docs/FRONTEND.md).
