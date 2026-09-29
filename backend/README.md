# Gidh Intraday — Go Backend Service

For comprehensive architecture details, endpoint references, and streaming mechanics, refer to the documentation:

👉 **[docs/BACKEND.md](../docs/BACKEND.md)** — Core Architecture & API Specification  
👉 **[docs/GO_BACKEND_AGENT_GUIDE.md](../docs/GO_BACKEND_AGENT_GUIDE.md)** — Agent Rules & 150-Line Constraint  
👉 **[docs/DATABASE.md](../docs/DATABASE.md)** — TimescaleDB & Postgres Schema  

---

### Quick Start

```bash
# Run tests
go test -count=1 ./...

# Build gidh-server
go build -o bin/gidh-server ./cmd/gidh-server

# Run server
./bin/gidh-server
```
