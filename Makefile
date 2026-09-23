.PHONY: help dev stop status logs server web test build \
        auth universe history features eod deploy

ROOT_DIR := $(shell pwd)
PID_DIR := $(ROOT_DIR)/.pids
LOG_DIR := $(ROOT_DIR)/logs

help:
	@echo "=============================================================================="
	@echo " GIDH INTRADAY — UNIFIED ENGINE WORKSPACE"
	@echo "=============================================================================="
	@echo " Dev Services (Unified Go Server + Next.js UI):"
	@echo "   make dev              Start gidh-server (:8080) and web UI (:3000) in background"
	@echo "   make server           Run unified gidh-server in foreground (:8080)"
	@echo "   make web              Run Next.js UI in foreground (:3000)"
	@echo "   make stop             Stop all background dev processes"
	@echo "   make status           Show PID and status of running services"
	@echo "   make logs             Tail all service logs"
	@echo ""
	@echo " Build & Test:"
	@echo "   make build            Compile gidh-server and Next.js production build"
	@echo "   make test             Run Go tests across backend"
	@echo ""
	@echo " Batch & Data Ingestion:"
	@echo "   make auth             Generate Kite Access Token using TOTP"
	@echo "   make universe         Sync 210 F&O stock instruments"
	@echo "   make history          Backfill historical 1m and 1d candles"
	@echo "   make features         Compute EOD daily features"
	@echo "   make eod              Run EOD integrity & trade settlement"
	@echo "=============================================================================="

# ==============================================================================
# 1. DEV SERVICES
# ==============================================================================

dev: server-dev web-dev
	@echo ""
	@echo "✅ Gidh Intraday running in background!"
	@make status

server-dev:
	@mkdir -p $(PID_DIR) $(LOG_DIR)
	@if [ -f $(PID_DIR)/server.pid ] && kill -0 $$(cat $(PID_DIR)/server.pid) 2>/dev/null; then \
		echo "⚠️  gidh-server is already running (PID: $$(cat $(PID_DIR)/server.pid))"; \
	else \
		echo "🚀 Building & starting gidh-server (REST + WebSockets on :8080)..."; \
		(cd backend && go build -o bin/gidh-server ./cmd/gidh-server); \
		nohup ./backend/bin/gidh-server > $(LOG_DIR)/server.log 2>&1 & echo $$! > $(PID_DIR)/server.pid; \
		echo "   gidh-server running on PID: $$(cat $(PID_DIR)/server.pid) -> logs/server.log"; \
	fi

web-dev:
	@mkdir -p $(PID_DIR) $(LOG_DIR)
	@if lsof -ti:3000 >/dev/null 2>&1; then \
		echo "⚠️  web is already running on port 3000 (PID: $$(lsof -ti:3000 | head -n 1))"; \
	else \
		echo "🚀 Starting web UI (Next.js dev on :3000)..."; \
		node -e 'const fs = require("fs"); const { spawn } = require("child_process"); const out = fs.openSync("$(LOG_DIR)/web.log", "a"); const child = spawn(process.execPath, ["./node_modules/next/dist/bin/next", "dev", "-p", "3000"], { cwd: "$(ROOT_DIR)/web", detached: true, stdio: ["ignore", out, out] }); child.unref(); fs.writeFileSync("$(PID_DIR)/web.pid", String(child.pid));'; \
		echo "   web running on PID: $$(cat $(PID_DIR)/web.pid 2>/dev/null) -> logs/web.log"; \
	fi

server:
	@cd backend && go run ./cmd/gidh-server

web:
	@cd web && npm run dev

# ==============================================================================
# 2. PROCESS MANAGEMENT & LOGS
# ==============================================================================

stop:
	@if [ -f $(PID_DIR)/server.pid ]; then \
		PID=$$(cat $(PID_DIR)/server.pid); \
		kill -TERM $$PID 2>/dev/null || kill -9 $$PID 2>/dev/null; \
		rm -f $(PID_DIR)/server.pid; \
	fi
	@if [ -f $(PID_DIR)/web.pid ]; then \
		PID=$$(cat $(PID_DIR)/web.pid); \
		kill -TERM $$PID 2>/dev/null || kill -9 $$PID 2>/dev/null; \
		rm -f $(PID_DIR)/web.pid; \
	fi
	@-lsof -ti:8080 | xargs kill -9 2>/dev/null || true
	@-lsof -ti:3000 | xargs kill -9 2>/dev/null || true
	@echo "🛑 All services stopped."

status:
	@echo "------------------------------------------------------------------------------"
	@echo " SERVICE STATUS"
	@echo "------------------------------------------------------------------------------"
	@if lsof -ti:8080 >/dev/null 2>&1; then \
		echo "  🟢 gidh-server : RUNNING (PID $$(lsof -ti:8080 | head -n 1)) -> http://localhost:8080/healthz"; \
	else \
		echo "  ⚪ gidh-server : STOPPED"; \
	fi
	@if lsof -ti:3000 >/dev/null 2>&1; then \
		echo "  🟢 web UI     : RUNNING (PID $$(lsof -ti:3000 | head -n 1)) -> http://localhost:3000"; \
	else \
		echo "  ⚪ web UI     : STOPPED"; \
	fi
	@echo "------------------------------------------------------------------------------"

logs:
	@mkdir -p $(LOG_DIR)
	@touch $(LOG_DIR)/server.log $(LOG_DIR)/web.log
	@tail -f $(LOG_DIR)/server.log $(LOG_DIR)/web.log

# ==============================================================================
# 3. BUILD & TESTS
# ==============================================================================

build:
	@echo "--> Building gidh-server binary..."
	@(cd backend && go build -ldflags="-w -s" -o bin/gidh-server ./cmd/gidh-server)
	@echo "--> Building web UI production bundle..."
	@(cd web && npm run build)
	@echo "✅ Build completed successfully."

test:
	@echo "--> Running backend tests..."
	@(cd backend && go test -v ./...)

# ==============================================================================
# 4. DATA & BATCH UTILITIES
# ==============================================================================

auth:
	@cd backend && go run ./cmd/gidh-auth $(TOKEN)

universe:
	@cd backend && go run ./cmd/gidh-batch instruments sync --expected-count=210

history:
	@cd backend && go run ./cmd/gidh-batch candles backfill --daily-days=365 --minute-days=60

features:
	@cd backend && go run ./cmd/gidh-batch features daily

eod:
	@cd backend && go run ./cmd/gidh-batch eod $(ARGS)

deploy:
	@./infra/scripts/deploy.sh all
