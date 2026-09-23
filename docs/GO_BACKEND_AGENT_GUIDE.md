# Go Backend Guide for AI Agents

This document is a reusable engineering contract for AI agents building or
maintaining backend services. The standard stack is Go, REST, WebSockets,
Redis, and PostgreSQL with TimescaleDB where time-series behavior is needed.

## 1. Non-Negotiable Rules

1. Keep every source-code file at or below **150 physical lines**, including
   tests and comments. Split by responsibility before a file reaches the limit.
2. Do not keep mutable application state in process memory. Redis owns shared,
   transient, coordination, session, and cache state.
3. PostgreSQL owns durable relational data. TimescaleDB hypertables own durable
   time-series data.
4. Do not add a cache by default. When measured behavior justifies caching, use
   Redis with an explicit TTL and invalidation strategy.
5. Keep business rules independent of HTTP, WebSocket, Redis, PostgreSQL, and
   vendor SDK details.
6. Prefer the Go standard library. Add a dependency only when its benefit and
   operational cost are understood.
7. Make the smallest correct change. Do not combine feature work with unrelated
   refactoring or formatting.

## 2. Agent Workflow

Before changing code, the agent must:

1. Read the request and identify the behavior's owner.
2. Trace inputs, outputs, callers, storage, external calls, and side effects.
3. Search for an existing implementation before creating a new abstraction.
4. Check the line count of every file that may be edited.
5. State assumptions that materially affect behavior, risk, or scope.
6. Define a small verification plan.

While changing code, the agent must preserve package boundaries, avoid hidden
global state, propagate context, wrap errors, and add focused tests for
non-trivial behavior.

Before finishing, the agent must run formatting, static checks, tests, the race
detector when concurrency changed, and a source-file line-length check. It must
report what changed, why that layer owns the change, and what was verified.

## 3. Recommended Project Shape

```text
cmd/
  api/                 # composition root; wiring only
  worker/              # background process entry point
internal/
  account/             # one business domain
    model.go
    service.go
    repository.go
    errors.go
  transport/
    http/               # routing, request parsing, response mapping
    websocket/          # connection lifecycle and message mapping
  postgres/             # repository implementations
  redis/                # state, coordination, and cache implementations
  config/               # validated configuration
  observability/        # logging, metrics, and tracing setup
migrations/
```

Organize business code by domain, not by generic technical buckets. Avoid
packages named `utils`, `helpers`, `common`, or `misc`. A package should have a
clear owner and a narrow public API.

Dependency direction:

```text
REST/WebSocket -> application service -> consumer-defined port -> adapter
                                             |                 Redis/Postgres
                                             +-> domain types
```

The `main` package is a composition root. It loads configuration, constructs
dependencies, starts servers and workers, handles signals, and shuts down. It
contains no business logic.

## 4. Go Coding Standards

- Run `gofmt`; do not debate formatting.
- Use short names only for small local scopes. Exported names must communicate
  domain meaning.
- Keep functions focused. If a function mixes validation, business decisions,
  persistence, and presentation, split it.
- Prefer early returns over deeply nested branches.
- Accept interfaces where they are consumed; normally return concrete types.
- Keep interfaces small and behavior-oriented. Do not create an interface for
  every struct.
- Use constructors to establish valid objects and explicit dependencies.
- Avoid package-level mutable variables and `init` side effects.
- Pass `context.Context` as the first argument; never store it in a struct.
- Use UTC internally and at storage boundaries. Convert time zones only at an
  external presentation boundary.
- Use typed structs at boundaries. Avoid `map[string]any` for known schemas.
- Document exported APIs and surprising decisions, not obvious statements.
- Never log secrets, credentials, tokens, full authorization headers, or
  sensitive personal data.

The 150-line limit is a design signal, not a reason to compress code. Do not use
long lines, dense expressions, or reduced test clarity to satisfy it. Split by
behavior, such as `orders_create.go`, `orders_cancel.go`, and
`orders_repository.go`. Generated files must also be split or generated in a
way that respects the limit; vendor directories are outside application code.

## 5. State and Data Ownership

Application instances must be disposable and horizontally scalable. Do not use
in-memory maps for shared state, sessions, locks, rate limits, subscriptions,
job status, idempotency keys, or cross-request coordination.

Use Redis for:

- ephemeral shared state with explicit TTLs;
- sessions and idempotency records;
- rate limiting and distributed coordination;
- Pub/Sub or Streams when their delivery semantics fit the requirement;
- cache entries whose keys, TTLs, invalidation, and failure behavior are known.

Use PostgreSQL for durable source-of-truth data, transactions, constraints, and
auditable state transitions. Use TimescaleDB for append-heavy time-series data,
time-window queries, retention, compression, and continuous aggregates.

Redis is not the durable source of truth unless persistence, recovery, and data
loss semantics are explicitly designed. Every cache must define its key format,
TTL, invalidation owner, stampede protection, and behavior when Redis is down.

Database rules:

- enforce invariants with constraints as well as application validation;
- use transactions only across operations requiring atomicity;
- keep transactions short and never hold them across network calls;
- use parameterized queries and verify query plans for critical paths;
- make migrations forward-safe, reviewable, and compatible with rolling deploys;
- bound connection pools and expose pool saturation metrics;
- design TimescaleDB partition keys and indexes from real query patterns.

## 6. REST Standards

- Treat handlers as adapters: decode, validate, call one application operation,
  and encode the result.
- Use consistent JSON envelopes and a stable error schema containing a machine
  code, safe message, and request ID.
- Validate request size, content type, fields, and pagination bounds.
- Use correct HTTP methods and status codes; do not expose internal errors.
- Make retryable write operations idempotent where practical.
- Version externally consumed APIs and preserve compatibility during rollout.
- Set server read, write, idle, and header timeouts.
- Propagate cancellation and deadlines to Redis, PostgreSQL, and external APIs.

## 7. WebSocket Standards

- Authenticate and authorize during connection establishment and again for
  privileged message actions.
- Define versioned inbound and outbound message envelopes.
- Allow one writer per connection; serialize writes through a bounded queue.
- Bound message size, queue depth, subscriptions, and connection lifetime.
- Limit high-frequency data streams delivered to the UI to **1 Hz per logical
  stream or subscription**. Coalesce within each one-second window and send the
  latest snapshot; do not build and later flush a backlog of obsolete updates.
- Do not throttle correctness-critical control events such as order status,
  execution, authorization, error, or connection-state messages. Deliver those
  immediately on the ordered control path.
- Implement ping/pong deadlines, idle detection, graceful close, and cleanup.
- Apply backpressure: disconnect persistently slow consumers instead of growing
  memory without limit.
- Store shared connection/subscription state in Redis when multiple instances
  must coordinate. A process-local connection handle may exist only for the
  socket physically attached to that process.
- Choose Redis Pub/Sub only when loss during disconnects is acceptable. Use
  Redis Streams or durable database-backed delivery when replay is required.
- Make reconnect behavior explicit: resume token, replay cursor, or fresh state.

## 8. Errors, Concurrency, and Resilience

Wrap errors with operation context using `%w`. Define stable domain errors only
when callers need to make a decision with `errors.Is` or `errors.As`. Map domain
errors to transport responses at the transport boundary. Log an error once at
the boundary responsible for handling it.

Every goroutine must have an owner, a stop condition, cancellation, and a plan
for reporting failure. Use bounded worker pools and queues. Do not launch
unbounded goroutines from HTTP or WebSocket input. Protect process-local data
from races, even when shared state lives in Redis.

External calls require deadlines. Retries must be bounded, use backoff and
jitter, and apply only to safe or idempotent operations. Graceful shutdown must
stop intake, drain bounded work, close WebSockets, and close clients within a
fixed deadline.

## 9. Observability and Security

Emit structured logs with service, operation, request or trace ID, duration,
and safe error classification. Measure request rate, latency, errors,
saturation, WebSocket connections, queue depth, Redis latency, and database
pool usage. Provide liveness and readiness endpoints; readiness must reflect
dependencies required to serve traffic.

Validate all untrusted input, use least-privilege database and Redis accounts,
load secrets from an approved secret store or environment injection, and keep
dependencies patched. Authentication proves identity; authorization must still
be checked for every protected resource or action.

## 10. Testing and Required Checks

Test behavior rather than private implementation details. Use unit tests for
domain rules, integration tests for Redis/PostgreSQL adapters and migrations,
and transport tests for REST/WebSocket contracts. Include failure, timeout,
cancellation, duplicate, reconnect, and concurrency cases where relevant.

Minimum local or CI checks:

```bash
gofmt -w .
go vet ./...
go test ./...
go test -race ./...
staticcheck ./...
```

CI must also fail when an application Go file exceeds 150 lines. A portable
check can be implemented with a small repository script; it should inspect
tracked `*.go` files, exclude only third-party/vendor content, print offending
paths and counts, and exit non-zero.

## 11. Definition of Done

A backend change is complete only when:

- behavior belongs to the correct domain and layer;
- no application code file exceeds 150 lines;
- no shared mutable state was introduced in process memory;
- storage, TTL, consistency, and failure semantics are explicit;
- APIs and WebSocket messages remain compatible or are deliberately versioned;
- data streams respect the 1 Hz UI delivery contract while control events remain
  immediate;
- timeouts, cancellation, backpressure, and shutdown are handled;
- focused tests cover important success and failure paths;
- formatting, static analysis, tests, and relevant race checks pass;
- logs and metrics make the behavior diagnosable in production;
- the agent reports any unverified assumption or remaining operational risk.
