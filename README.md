# Gidh Intraday (🦅)

Institutional-grade, zero-latency quantitative market terminal, replay engine, and MIS execution cockpit for the Indian equity and derivatives markets (NSE & NFO).

## Architecture

- **Web Cockpit**: Next.js 16 (App Router, TailwindCSS, Lightweight Charts, Firebase Auth Gate).
- **Backend**: Go (Read API, Replay Streamer, Order Manager with Zerodha Kite & Paper Trading).
- **Storage**: TimescaleDB 16 (3.45M+ 1m/1d candles and roll-forward features) & Redis 7 (Hot state & Pub/Sub).
- **Edge**: Nginx SSL reverse proxy (`gidh.tech`).

---

## Quick Start (Local Development)

```bash
# 1. Start database & cache
docker compose -f docker-compose.local.yml up timescaledb-local redis-local -d

# 2. Run backend API (offline paper trading mode)
make api-restart

# 3. Start Web UI
make web
```

- Web Terminal: `http://localhost:3000`
- Read API: `http://localhost:8080/healthz`

---

## Make Commands

```bash
make web          # Start Next.js War Room UI (pnpm dev)
make api          # Start Go API
make api-restart  # Kill port 8080 and restart Go API
make universe     # Sync 210 F&O instruments
make history      # Backfill 1m / 1d historical candles
make features     # Generate daily baseline features
make test         # Run backend unit tests
make auth TOKEN=x # Renew Zerodha daily access token
```

---

## Documentation

- [ai-docs/INDEX.md](ai-docs/INDEX.md) — System Architecture, Endpoints & DB Schema
- [PRODUCT.md](PRODUCT.md) — Product Design & 5-Slot MIS Risk Model
- [DESIGN.md](DESIGN.md) — Clinical Monochrome Design System
- [UNIVERSE.md](UNIVERSE.md) — 210 F&O Active Universe Contract
- [AGENTS.md](AGENTS.md) — Developer & Agent Contract
