.PHONY: help ai ai-test api auth universe history features integrity test

help:
	@echo "Gidh batch kernel"
	@echo "  make ai         Run the AI read client (pass ARGS='sessions')"
	@echo "  make ai-test    Run AI-layer tests"
	@echo "  make api        Start the local read-only market API"
	@echo "  make auth       Renew the local Kite access token"
	@echo "  make universe   Refresh the 210-symbol cash/future universe"
	@echo "  make history    Seed or repair raw candle history"
	@echo "  make features   Build the current daily feature baseline"
	@echo "  make integrity  Run EOD repair when backend has not published READY"
	@echo "  make test       Run batch-kernel tests"

lab:
	@cd analysis && ./.venv/bin/streamlit run app.py --server.port 8501

api:
	@cd backend && go run ./cmd/gidh-api

ai:
	@cd ai && PYTHONPATH=src python3 -m gidh_ai $(ARGS)

ai-test:
	@cd ai && PYTHONPATH=src python3 -m unittest discover -s tests

auth:
	@cd backend && go run ./cmd/gidh-auth $(TOKEN)

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
