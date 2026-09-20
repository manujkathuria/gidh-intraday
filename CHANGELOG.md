# Changelog

All notable changes to the **Gidh Intraday** trading system will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.0.1] - 2026-09-20

### 🚀 Major Releases & Architectural Enhancements

#### 1. Go Edge Real-Time Engine & Live Order Manager (`edge/`)
- **Single Execution Owner**: Introduced `gidh-edge` as the unified real-time GraphQL server (`/graphql`), WebSocket streaming hub (`/v1/`), and live order execution manager.
- **Zerodha Kite Connect Integration**: Direct integration with Zerodha Kite Connect API supporting 5x intraday MIS leverage across 210 F&O universe stocks.
- **Synthetic Limit & Bracket Orders**:
  - Live limit orders with tick-level triggering.
  - Sub-millisecond synthetic stop loss (1.0% Fixed MAE) and profit target (2:1 R:R) brackets monitored via Zerodha WebSocket stream.
  - Automatic square-off upon Invalidation or MAE/Target hit.
- **Emergency Tripwire Fuse**:
  - Sliding-window rate limiter tripping the kill switch if `>5 orders` are placed within `3 seconds`.
  - Automatic circuit breaking and WebSocket event broadcast (`RISK_STATE_CHANGED`).
  - Emergency banner and manual `resetTripwire` GraphQL mutation in the Cockpit.

#### 2. Quant AI War Room (`quant/` & `web/src/features/brain/`)
- **Two-Tier Cognitive Architecture**:
  - **Macro Selector Brain**: Evaluates pre-market regime, sector money flows, and institutional futures inflows to output top focus tickers.
  - **Micro Execution Brain**: Analyzes 09:31 ORB structure, VWAP pullbacks, and OI build-up to compute exact entry limits, stop losses, and target brackets.
- **Database Persistence & Memory**:
  - Added `quant.brain_sessions` hypertable storing all walk-forward LLM reasoning, theses, decisions, sensory features, and forensics.
  - Added `quant.brain_memory` storing cumulative cross-session cognitive state and learned lessons.
- **Web Cockpit Brain Studio (`/brain`)**:
  - **Macro Selector Tab**: Daily focus list, regime classification, and AI reasoning.
  - **09:31 Micro Brackets Tab**: Order brackets, trigger prices, invalidation rules, and execution outcomes.
  - **Cognitive Memory Tab**: Markdown rendering of historical trading memory and rules.

#### 3. Database Schema & Data Layer (`database/migrations/`)
- **Migration 0070**: Created `quant.brain_sessions` and `quant.brain_memory` with all 13 walk-forward session histories synced.
- **Migration 0080**: Added `sector VARCHAR(64)` to `market.instruments` and classified all 210 F&O universe instruments.

#### 4. Frontend Cockpit UI (`web/`)
- **Next.js 16 Standalone**: Built and optimized with Turbopack for sub-second rendering.
- **Live Positions & Orders Terminal (`/positions`)**:
  - Real-time active positions table with live tick P&L, MFE tracking, and instant Square-Off.
  - Pending synthetic limit orders table with cancellation controls.
  - Closed positions historical ledger.
  - Tripwire fuse emergency banner with reset controls.
- **Interactive Documentation (`/docs`)**:
  - Added *Edge Order Manager Engine* architecture article.
  - Added *Micro Execution Protocol* specifications.
  - Added *TimescaleDB & PostgreSQL Schema Reference* with complete ER diagrams.
- **Futures & Sector Radar (`/futures`, `/sectors`, `/radar`)**:
  - Dynamic sorting, sector filtering, and real-time streaming price updates.

#### 5. High-Performance Build & Deployment Pipeline (`scripts/deploy.sh`)
- **Remote Build Server**: Builds Linux/AMD64 Docker images natively on a dedicated 16-core build server (`192.168.68.107`).
- **Direct Image Streaming**: Streams compressed images directly from build server to production VM (`148.230.66.138`).
- **Automated Morning Auth**: 08:45 IST weekday cron job (`gidh-auth`) with automated TOTP login for daily Zerodha token refresh.
