.PHONY: help ai ai-test api api-restart web lab auth live eod universe history features integrity test

help:
	@echo "Gidh Intraday Engine & War Room"
	@echo "  make live        Start live universe REST quote polling & feature engine"
	@echo "  make eod         Run EOD integrity verification & pre-warm Redis replay"
	@echo "  make api         Start the Go read-only market & replay API"
	@echo "  make api-restart Kill any running instance on port 8080 and start Go API"
	@echo "  make web         Start the Next.js War Room UI (pnpm dev)"
	@echo "  make lab         Start the Streamlit analysis sandbox"
	@echo "  make ai          Run the AI quantitative engine"
	@echo "  make test        Run Go tests"

lab:
	@cd analysis && ./.venv/bin/streamlit run app.py --server.port 8501

api:
	@cd backend && go run ./cmd/gidh-api

api-restart:
	@echo "Restarting Go API on port 8080..."
	@-lsof -ti:8080 | xargs kill -9 2>/dev/null || true
	@cd backend && go run ./cmd/gidh-api

web:
	@cd web && pnpm dev

ai:
	@cd ai && python3 cli/main.py $(ARGS)

ai-test:
	@cd ai && python3 -m unittest discover -s tests

auth:
	@cd backend && go run ./cmd/gidh-auth $(TOKEN)

live:
	@cd backend && go run ./cmd/gidh-batch live $(ARGS)

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
	@cd backend && go test ./...
