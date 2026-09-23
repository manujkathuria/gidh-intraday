# Infrastructure Guide for AI Agents

This document is a reusable engineering contract for AI agents maintaining
deployment infrastructure built with Docker, Docker Compose, Nginx,
PostgreSQL/TimescaleDB, Redis, shell scripts, cron jobs, and data-maintenance
jobs.

## 1. Non-Negotiable Rules

1. Infrastructure changes must be repeatable, idempotent, reviewable, and safe
   to rerun after partial failure.
2. Never place secrets in source control, container images, Compose files,
   command output, logs, URLs, or frontend-visible environment variables.
3. Never deploy, run a production migration, rotate credentials, restore data,
   or execute destructive maintenance without explicit user authorization.
4. Resolve and display the exact environment and target before any production
   mutation. Never infer production from the current shell context.
5. Pin runtime and service images to explicit versions. Production releases
   must use immutable release tags or digests, not only `latest`.
6. A backup is not considered valid until restoration has been tested.
7. Every deployment needs readiness checks, a bounded verification window, and
   a documented rollback path.
8. Cron and maintenance jobs require locking, timeouts, useful logs, failure
   signaling, and safe retry semantics.
9. Keep authored shell scripts and focused configuration modules at or below
   **150 physical lines**. Split by operation instead of compressing logic.
10. Make the smallest correct change and do not mix unrelated infrastructure
    cleanup with operational changes.

Database migrations are governed by one purpose per migration rather than an
arbitrary line limit. Large declarative schema snapshots may exceed 150 lines,
but agents must inspect and change only the relevant objects.

## 2. Agent Workflow

Before changing infrastructure, the agent must:

1. Identify the target environments and whether the request authorizes local,
   staging, or production changes.
2. Trace dependencies, startup order, ports, volumes, networks, secrets, health
   checks, persistent data, and rollback behavior.
3. Inspect the current Docker, Nginx, schema, migration, script, and scheduler
   ownership before adding anything.
4. Check current runtime versions and existing operational conventions.
5. Determine the blast radius and data-loss, downtime, and compatibility risks.
6. State material assumptions and define validation before making changes.

Agents may perform read-only inspection without separate authorization. A code
request authorizes repository edits and local verification, but it does not
authorize production deployment or mutation.

Before finishing, the agent must validate syntax, render or resolve generated
configuration, run the smallest relevant local checks, review the semantic
diff, and report what was changed, what was verified, and what still requires a
controlled environment.

## 3. Recommended Infrastructure Shape

```text
infra/
  deployment/
    docker-compose.local.yml
    docker-compose.prod.yml
  nginx/
    nginx.local.conf
    nginx.conf
  database/
    schema.sql                 # optional canonical snapshot
    migrations/
      001_initial.up.sql
      002_add_orders.up.sql
  scripts/
    deploy.sh
    backup.sh
    restore.sh
    cron_*.sh
    maintenance_*.sh
```

Keep environment differences explicit. Avoid copying entire configurations
when a small, obvious override is sufficient, but do not create inheritance so
complex that the final production configuration is difficult to inspect.

## 4. Environment and Configuration Standards

- Separate local, staging, and production configuration.
- Validate required environment variables at startup and fail with a safe,
  actionable message.
- Use a secret manager or controlled environment injection for secrets.
- Provide a committed `.env.example` containing names and safe descriptions,
  never real credentials.
- Treat every `NEXT_PUBLIC_*` value as public information.
- Use consistent service names, ports, paths, and environment-variable names.
- Document defaults; production-critical settings should not silently receive
  insecure defaults.
- Store timestamps in UTC and configure the business time zone explicitly only
  where schedules require it.
- Never print complete environment dumps during debugging or deployment.

## 5. Dockerfile Standards

- Use a minimal, trusted base image pinned to a version and preferably a digest.
- Use multi-stage builds so compilers and package managers stay out of runtime
  images.
- Pin dependency lockfiles and use reproducible installation commands.
- Run the final process as a non-root user.
- Copy only required runtime artifacts; use `.dockerignore` aggressively.
- Do not copy `.env`, credentials, SSH keys, source-control metadata, or local
  build output into an image.
- Prefer a read-only root filesystem and explicit writable volumes or tmpfs.
- Define a useful health check when the orchestrator consumes it.
- Handle termination signals correctly and make the application process PID 1
  or use a small init process when necessary.
- Set resource expectations and avoid unlimited temporary-file growth.
- Add image metadata for revision and build date without leaking secrets.
- Scan production images and resolve critical vulnerabilities before release.

Do not install debugging tools in production images. Build arguments are not a
secure secret channel because they may remain visible in image history.

## 6. Docker Compose Standards

- Use Compose for service topology, not for embedding procedural deployment
  logic.
- Pin production images to the release being deployed.
- Use service health checks and dependency conditions based on readiness, not
  fixed sleeps.
- Define bounded CPU and memory behavior appropriate to the deployment runtime.
- Mount configuration and certificates read-only.
- Use named volumes for durable data and document ownership and backup scope.
- Expose only ports that must be reachable from the host.
- Keep databases and Redis on private networks unless external access is an
  explicit requirement.
- Set restart policies deliberately; restart loops must remain observable.
- Validate the resolved configuration before deployment:

```bash
docker compose -f infra/deployment/docker-compose.prod.yml config --quiet
```

Never use `container_name` as a service-discovery requirement when horizontal
scaling is expected. Never run `down -v`, prune volumes, or delete images used
for rollback as an incidental deployment step.

## 7. Nginx Standards

- Redirect HTTP to HTTPS except for required certificate challenges.
- Support only maintained TLS versions and keep certificate renewal observable.
- Forward `Host`, client address, request ID, and original protocol correctly.
- Set explicit connection, header, body, upstream read, and upstream send
  timeouts appropriate to each route.
- Set request-body, header, connection, and rate limits at trust boundaries.
- Configure WebSocket routes with HTTP/1.1, `Upgrade`, and `Connection` headers,
  long-lived read timeouts, and upstream failure behavior.
- Do not buffer streaming responses when buffering would break their semantics.
- Restrict administrative, metrics, and debug endpoints from public access.
- Add security headers centrally and verify they do not break the application.
- Cache immutable hashed assets for a long duration; do not cache personalized
  API responses by default.
- Use graceful reloads and validate configuration before applying it:

```bash
nginx -t
```

Nginx may enforce connection and traffic limits, but the backend owns the 1 Hz
application-level WebSocket data contract. The UI independently owns its 1 Hz
render limit. Do not attempt message-aware throttling in Nginx.

## 8. PostgreSQL and TimescaleDB Standards

PostgreSQL owns durable relational truth. TimescaleDB owns durable time-series
data that benefits from hypertables, retention, compression, or continuous
aggregates. Redis must not replace either without an explicit durability design.

- Apply schema changes through ordered, committed migrations.
- Give each migration one purpose and make its name describe the change.
- Never edit a migration that may already have run in a shared environment.
- Keep an optional schema snapshot synchronized through automation, not manual
  production edits.
- Use constraints to enforce invariants and indexes based on measured queries.
- Use `timestamptz` for real instants and store them in UTC.
- Make application and schema changes compatible with rolling deployment.
- Prefer expand-and-contract changes: add compatible structure, deploy readers
  and writers, backfill safely, then remove obsolete structure later.
- Avoid long table locks. Estimate lock behavior, runtime, disk growth, and WAL
  growth before changing large tables or hypertables.
- Run large backfills in bounded, resumable batches with progress checkpoints.
- Test migrations against production-like volume and verify query plans.
- Define retention and compression policies from business recovery needs.
- Use least-privilege runtime and migration roles.

Every migration plan must state forward behavior, rollback or roll-forward
strategy, application compatibility window, verification query, and expected
operational impact. Destructive schema changes require a verified backup and
explicit production authorization.

## 9. Redis Standards

- Define Redis's role for each key: cache, session, coordination, idempotency,
  Pub/Sub, Stream, or transient shared state.
- Use namespaced, versioned keys with documented TTL and ownership.
- Set memory limits and choose an eviction policy that matches data semantics.
- Do not depend on eviction for correctness-critical state.
- Configure persistence and recovery when Redis-held data must survive restart.
- Protect Redis with private networking, authentication, least privilege, and
  TLS when traffic crosses an untrusted network.
- Monitor memory, evictions, latency, rejected connections, replication, and
  persistence failures.
- Never run broad key deletion or `FLUSH*` commands as routine maintenance.

## 10. Shell Script Standards

- Start Bash scripts with `#!/usr/bin/env bash` and `set -euo pipefail`.
- Quote variable expansions and use arrays for command arguments.
- Resolve paths from the script location instead of assuming the working
  directory.
- Validate arguments, required commands, configuration, and targets before
  making changes.
- Provide `--help`; destructive or high-impact scripts must provide `--dry-run`.
- Use functions with one operational responsibility and meaningful names.
- Write concise timestamped logs with job, environment, release, and outcome.
- Send errors to stderr and return non-zero on actual failure.
- Use `trap` for cleanup and preserve the original exit status.
- Set timeouts for network and subprocess operations.
- Use secure temporary directories from `mktemp -d` and clean them on exit.
- Do not suppress failures with `|| true` unless failure is explicitly safe and
  logged with its operational consequence.
- Do not parse human-formatted command output when a machine-readable option is
  available.
- Pass secrets through protected inputs and redact commands that could expose
  them.

Scripts must be idempotent or detect and clearly reject a repeated run. Keep
deployment, migration, backup, restore, and cleanup as separate commands.

## 11. Cron and Maintenance Jobs

Every scheduled job must define:

- owner and business purpose;
- explicit time zone and schedule;
- maximum runtime and timeout behavior;
- single-run locking to prevent overlap;
- idempotency or a durable deduplication key;
- retry policy with backoff and a retry ceiling;
- structured logs with start, end, duration, and processed counts;
- success metric, failure alert, and operator runbook;
- resource limits and impact on online traffic;
- safe manual replay procedure.

Use `flock` or a durable distributed lock when multiple hosts can execute the
same schedule. A lock must have safe crash behavior. Do not hide job failures to
keep cron quiet; route output and exit status into monitoring.

Maintenance and cleanup jobs must default to bounded batches, enforce retention
floors, show the selected records in dry-run mode, and stop safely when a
dependency becomes unhealthy.

## 12. Deployment and Rollback

A deployment flow must:

1. Validate the target, configuration, working tree or release artifact, disk
   capacity, dependency health, and required backup state.
2. Build once and identify artifacts with the immutable commit or release ID.
3. Scan and test that exact artifact.
4. Apply backward-compatible migrations through a controlled migration step.
5. Start or replace instances without exposing traffic before readiness.
6. verify health, logs, metrics, REST behavior, and WebSocket connectivity.
7. Record the deployed release and retain the previous artifact for rollback.
8. Fail clearly and either roll back safely or stop for operator intervention.

Do not report deployment success merely because containers started. Readiness
and a small functional smoke test must pass. Rollback must use a known previous
release, not rebuild old source. If a migration is not backward-compatible,
roll-forward recovery must be planned before deployment.

## 13. Backup and Restore

- Define recovery point and recovery time objectives for each persistent store.
- Encrypt backups in transit and at rest and restrict access.
- Keep backups outside the failure domain of the primary host.
- Monitor backup freshness, size, duration, and failures.
- Test restoration on a schedule using an isolated environment.
- Verify schema, row counts, critical queries, permissions, and application
  startup after restoration.
- Document point-in-time recovery requirements and required WAL retention.
- Never overwrite the only usable backup during a restore test.

Restore operations are destructive by nature and always require the exact
target, source backup, recovery point, downtime expectation, and explicit user
authorization.

## 14. Observability and Incident Safety

Collect container restarts, CPU, memory, disk, network, Nginx status and latency,
HTTP errors, WebSocket connections, database pool and replication health, Redis
health, cron outcomes, backup freshness, and certificate expiry.

Alerts should describe user impact and point to a runbook. Avoid alerts on raw
noise without an actionable threshold. Logs must include correlation and release
identifiers while excluding secrets and sensitive data.

During an incident, preserve evidence before cleanup. Prefer reversible actions,
make one controlled change at a time, record commands and outcomes, and verify
recovery from the user's perspective.

## 15. Required Checks

Run only checks applicable to the changed files, for example:

```bash
docker compose -f infra/deployment/docker-compose.local.yml config --quiet
docker compose -f infra/deployment/docker-compose.prod.yml config --quiet
nginx -t
shellcheck infra/scripts/*.sh
bash -n infra/scripts/*.sh
```

Also validate Docker builds, migration syntax and behavior, health checks, and a
local or isolated smoke test when those areas change. Never use production as
the first validation environment.

## 16. Definition of Done

An infrastructure change is complete only when:

- environment, ownership, dependencies, and blast radius are clear;
- configuration contains no embedded secrets or unsafe production defaults;
- authored scripts and focused configuration modules respect the 150-line rule;
- containers are pinned, least-privileged, health-checked, and resource-aware;
- Nginx routing, TLS, limits, timeouts, and WebSocket behavior are validated;
- migrations are compatible, bounded, verified, and recoverable;
- cron jobs are locked, timed out, observable, and safely repeatable;
- deployment readiness and rollback paths are explicit and tested where safe;
- backups and restoration requirements are addressed for persistent changes;
- relevant syntax checks, builds, tests, and smoke checks pass;
- no production mutation occurred without explicit authorization;
- the agent reports unverified assumptions and remaining operational risks.
