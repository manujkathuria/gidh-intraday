.PHONY: help dev stop status logs logs-edge logs-backend logs-web \
        edge-dev backend-dev web-dev stop-edge stop-backend stop-web \
        edge backend web eod universe history features test deploy

ROOT_DIR := $(shell pwd)
PID_DIR := $(ROOT_DIR)/.pids
LOG_DIR := $(ROOT_DIR)/logs

help:
	@echo "=============================================================================="
	@echo " GIDH INTRADAY — MULTI-SERVICE WORKSPACE MANAGEMENT"
	@echo "=============================================================================="
	@echo " Background Dev Services (go run / pnpm dev):"
	@echo "   make dev              Start edge, backend, and web in background"
	@echo "   make edge-dev         Start edge GraphQL service in background (:8080)"
	@echo "   make backend-dev      Start backend stream engine in background"
	@echo "   make web-dev          Start Next.js UI in background (:3000)"
	@echo ""
	@echo " Process Management & Logs:"
	@echo "   make status           Show PID and running status of all services"
	@echo "   make stop             Stop all background dev services"
	@echo "   make stop-edge        Stop edge service"
	@echo "   make stop-backend     Stop backend service"
	@echo "   make stop-web         Stop web service"
	@echo "   make logs             Tail all service logs simultaneously"
	@echo "   make logs-edge        Tail logs/edge.log"
	@echo "   make logs-backend     Tail logs/backend.log"
	@echo "   make logs-web         Tail logs/web.log"
	@echo ""
	@echo " Foreground Runners (Interactive):"
	@echo "   make edge             Run edge GraphQL in foreground"
	@echo "   make web              Run Next.js UI in foreground"
	@echo ""
	@echo " Batch & Strategy Utilities:"
	@echo "   make eod              Run EOD integrity & settlement"
	@echo "   make universe         Sync F&O instruments universe"
	@echo "   make features         Compute daily features"
	@echo "   make test             Run Go tests across edge and backend"
	@echo "=============================================================================="

# ==============================================================================
# 1. BACKGROUND SERVICE STARTERS (.pids + logs)
# ==============================================================================

dev: edge-dev backend-dev web-dev
	@echo ""
	@echo "✅ All services running in background!"
	@make status

edge-dev:
	@mkdir -p $(PID_DIR) $(LOG_DIR)
	@if [ -f $(PID_DIR)/edge.pid ] && kill -0 $$(cat $(PID_DIR)/edge.pid) 2>/dev/null; then \
		echo "⚠️  edge is already running (PID: $$(cat $(PID_DIR)/edge.pid))"; \
	else \
		echo "🚀 Building & starting edge GraphQL API..."; \
		(cd edge && go build -o bin/edge ./cmd/edge); \
		nohup ./edge/bin/edge > $(LOG_DIR)/edge.log 2>&1 & echo $$! > $(PID_DIR)/edge.pid; \
		echo "   edge running on PID: $$(cat $(PID_DIR)/edge.pid) -> logs/edge.log"; \
	fi

backend-dev:
	@mkdir -p $(PID_DIR) $(LOG_DIR)
	@echo "⚪ Backend batch engine is invoked on demand (e.g., make eod, make features)"

web-dev:
	@mkdir -p $(PID_DIR) $(LOG_DIR)
	@if lsof -ti:3000 >/dev/null 2>&1; then \
		echo "⚠️  web is already running on port 3000 (PID: $$(lsof -ti:3000 | head -n 1))"; \
	else \
		echo "🚀 Starting web UI (Next.js dev)..."; \
		node -e 'const fs = require("fs"); const { spawn } = require("child_process"); const out = fs.openSync("$(LOG_DIR)/web.log", "a"); const child = spawn(process.execPath, ["./node_modules/next/dist/bin/next", "dev", "-p", "3000"], { cwd: "$(ROOT_DIR)/web", detached: true, stdio: ["ignore", out, out] }); child.unref(); fs.writeFileSync("$(PID_DIR)/web.pid", String(child.pid));'; \
		echo "   web running on PID: $$(cat $(PID_DIR)/web.pid 2>/dev/null) -> logs/web.log"; \
	fi

# ==============================================================================
# 2. STOP & CLEAN PROCESSES
# ==============================================================================

stop: stop-edge stop-backend stop-web
	@echo "🛑 All services stopped."

stop-edge:
	@if [ -f $(PID_DIR)/edge.pid ]; then \
		PID=$$(cat $(PID_DIR)/edge.pid); \
		if kill -0 $$PID 2>/dev/null; then \
			kill -TERM $$PID 2>/dev/null || kill -9 $$PID 2>/dev/null; \
			echo "🛑 Stopped edge (PID: $$PID)"; \
		fi; \
		rm -f $(PID_DIR)/edge.pid; \
	fi
	@-lsof -ti:8080 | xargs kill -9 2>/dev/null || true

stop-backend:
	@if [ -f $(PID_DIR)/backend.pid ]; then \
		PID=$$(cat $(PID_DIR)/backend.pid); \
		if kill -0 $$PID 2>/dev/null; then \
			kill -TERM $$PID 2>/dev/null || kill -9 $$PID 2>/dev/null; \
			echo "🛑 Stopped backend (PID: $$PID)"; \
		fi; \
		rm -f $(PID_DIR)/backend.pid; \
	fi

stop-web:
	@if [ -f $(PID_DIR)/web.pid ]; then \
		PID=$$(cat $(PID_DIR)/web.pid); \
		if kill -0 $$PID 2>/dev/null; then \
			kill -TERM $$PID 2>/dev/null || kill -9 $$PID 2>/dev/null; \
			echo "🛑 Stopped web (PID: $$PID)"; \
		fi; \
		rm -f $(PID_DIR)/web.pid; \
	fi
	@-lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# ==============================================================================
# 3. STATUS & LOGS
# ==============================================================================

status:
	@echo "------------------------------------------------------------------------------"
	@echo " SERVICE STATUS"
	@echo "------------------------------------------------------------------------------"
	@if [ -f $(PID_DIR)/edge.pid ] && kill -0 $$(cat $(PID_DIR)/edge.pid) 2>/dev/null; then \
		echo "  🟢 edge      : RUNNING (PID $$(cat $(PID_DIR)/edge.pid)) -> http://localhost:8080/graphql"; \
	elif lsof -ti:8080 >/dev/null 2>&1; then \
		echo "  🟢 edge      : RUNNING (PID $$(lsof -ti:8080 | head -n 1)) -> http://localhost:8080/graphql"; \
	else \
		echo "  ⚪ edge      : STOPPED"; \
	fi
	@if [ -f $(PID_DIR)/web.pid ] && kill -0 $$(cat $(PID_DIR)/web.pid) 2>/dev/null; then \
		echo "  🟢 web       : RUNNING (PID $$(cat $(PID_DIR)/web.pid)) -> http://localhost:3000"; \
	elif lsof -ti:3000 >/dev/null 2>&1; then \
		echo "  🟢 web       : RUNNING (PID $$(lsof -ti:3000 | head -n 1)) -> http://localhost:3000"; \
	else \
		echo "  ⚪ web       : STOPPED"; \
	fi
	@echo "------------------------------------------------------------------------------"

logs:
	@mkdir -p $(LOG_DIR)
	@touch $(LOG_DIR)/edge.log $(LOG_DIR)/backend.log $(LOG_DIR)/web.log
	@tail -f $(LOG_DIR)/edge.log $(LOG_DIR)/backend.log $(LOG_DIR)/web.log

logs-edge:
	@mkdir -p $(LOG_DIR) && touch $(LOG_DIR)/edge.log
	@tail -f $(LOG_DIR)/edge.log

logs-backend:
	@mkdir -p $(LOG_DIR) && touch $(LOG_DIR)/backend.log
	@tail -f $(LOG_DIR)/backend.log

logs-web:
	@mkdir -p $(LOG_DIR) && touch $(LOG_DIR)/web.log
	@tail -f $(LOG_DIR)/web.log

# ==============================================================================
# 4. INTERACTIVE FOREGROUND RUNNERS
# ==============================================================================

edge:
	@cd edge && go run ./cmd/edge

web:
	@cd web && pnpm dev

# ==============================================================================
# 5. BATCH & QUANT UTILITIES
# ==============================================================================

auth:
	@cd backend && go run ./cmd/gidh-auth $(TOKEN)

eod:
	@cd backend && go run ./cmd/gidh-batch eod $(ARGS)

universe:
	@cd backend && go run ./cmd/gidh-batch instruments sync --expected-count=210

history:
	@cd backend && go run ./cmd/gidh-batch candles backfill --daily-days=365 --minute-days=60

features:
	@cd backend && go run ./cmd/gidh-batch features daily

integrity:
	@cd backend && go run ./cmd/gidh-batch integrity eod

test:
	@echo "--> Testing edge..."
	@(cd edge && go test ./...)
	@echo "--> Testing backend..."
	@(cd backend && go test ./...)

deploy:
	@./scripts/deploy.sh all
