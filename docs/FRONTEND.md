# Gidh Intraday — Frontend Architecture & UI Guide

The `web/` directory contains the modern, high-performance web terminal for Gidh Intraday built on Next.js 16 (Turbopack, App Router) and Tailwind CSS. It provides sub-second streaming visualizations, dynamic 210-stock radar filtering, an interactive lightweight-charts candlestick studio, and an atomic position & risk management console.

---

## 1. Architectural Overview

```
┌─────────────────────────────────────────────────────────────┐
│                 Next.js UI (App Router)                     │
│  - / (Radar Terminal)       - /chart (Candlestick Studio)   │
│  - /positions (Live MIS)    - /sectors (Breadth Matrix)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
  ┌─────────────────────────┐     ┌─────────────────────────┐
  │      Zustand Stores     │     │      REST API Client    │
  │  - marketStore.ts       │     │  - api_market.ts        │
  │  - liveOrderStore.ts    │     │  - api_trading.ts       │
  │  (Batched 1Hz Sync)     │     │  - api_risk.ts          │
  └────────────┬────────────┘     └────────────┬────────────┘
               │                               │
               ▼                               ▼
  ┌─────────────────────────────────────────────────────────┐
  │                 Go Backend (gidh-server)                │
  │            REST (:8080)  +  WebSockets (:8080)          │
  └─────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

All frontend code strictly enforces the **$\le 150$ physical lines per file** standard and feature-based encapsulation:

```
web/
├── src/
│   ├── app/                    # Next.js App Router route entrypoints
│   │   ├── page.tsx            # Radar Terminal (/)
│   │   ├── chart/page.tsx      # Candlestick Studio (/chart)
│   │   ├── positions/page.tsx  # Positions & Order Management (/positions)
│   │   ├── sectors/page.tsx    # Sector Heatmap & Breadth (/sectors)
│   │   └── layout.tsx          # Root Layout & Theme Provider
│   ├── features/               # Feature-based components & hooks
│   │   ├── header/             # Global AppShell, navigation rail, breadcrumbs & footer
│   │   ├── radar/              # 210-stock radar grid, filters, sorting & live rows
│   │   ├── chart/              # Lightweight-charts canvas, draggable lines, order modal
│   │   ├── positions/          # Active MIS cards, PnL summary, square-off modals
│   │   └── sectors/            # Sector ranking, breadth bars & stock drilldown
│   ├── stores/                 # Zustand global state stores
│   │   ├── marketStore.ts      # Live radar snapshot, sector data, WebSocket hub
│   │   └── liveOrderStore.ts   # Live orders, active/closed positions & trade actions
│   └── lib/                    # Typed API clients, WebSocket utilities & contracts
│       ├── api.ts              # Re-export barrel
│       ├── api_client.ts       # Base HTTP client with error handling
│       ├── api_market.ts       # Market snapshot, candles & sector HTTP calls
│       ├── api_trading.ts      # MIS order dispatch, cancel & square-off HTTP calls
│       ├── api_risk.ts         # Risk breaker status & tripwire reset
│       ├── types_market.ts     # Market & instrument TypeScript interfaces
│       └── types_trading.ts    # Order & position TypeScript interfaces
```

---

## 3. Core Terminals & Capabilities

### A. 210-Stock Radar (`src/features/radar/`)
- **Live Universe Feed**: Subscribed to `/v1/stream/radar` (1 Hz throttled updates).
- **Quant Filters**: Instantly sort and filter by VWAP Distance, RVOL, Day Range Rank, CLV, and Sector.
- **Dynamic Presets**: Quick access to predefined quant screeners (Bullish Momentum, VWAP Reversion, Heavy RVOL).

### B. Candlestick Studio (`src/features/chart/`)
- **Lightweight-Charts Engine**: High-framerate hardware-accelerated candle rendering.
- **Intraday Overlays**: Live VWAP, $\pm 1\sigma$ Sky Blue and $\pm 2\sigma$ Pink standard deviation bands, Previous Day High (PDH), and Previous Day Low (PDL).
- **Interactive Visual Trading**:
  - Drag-and-drop Stop Loss (`SL`) and Target Price (`TP`) lines directly on the chart.
  - Interactive Limit Order placement bar with real-time level calculation.
- **Responsive Canvas**: `ResizeObserver` dynamic scaling adapting smoothly to sidebar collapse/expand.

### C. Live Position & Risk Console (`src/features/positions/`)
- **Real-Time PnL Tracker**: Live position valuations, Max Favorable Excursion (MFE), and Max Adverse Excursion (MAE).
- **Atomic Execution & Square-Off**: Instant one-click square off, limit order adjustments, and safety-fused order dispatching.
- **Tripwire & Circuit Breakers**: Live visual telemetry for broker connection health and auto-stop fuse triggers.

### D. Sector Matrix (`src/features/sectors/`)
- **Sector Breadth**: Visualizes percentage of sector constituents trading above intraday VWAP.
- **Rotation Heatmap**: Tracks capital flow across all 14 NSE sectors in real-time.

---

## 4. Development & Running

### Prerequisites
- Node.js 20+
- npm 10+

### Environment Configuration (`web/.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

### Commands
```bash
# Install dependencies
cd web && npm install

# Run development server (Turbopack)
npm run dev

# Build production bundle
npm run build

# Start production server
npm run start
```
