# Next.js UI Guide for AI Agents

This document is a reusable engineering contract for AI agents building or
maintaining user interfaces with Next.js, React, TypeScript, Tailwind CSS,
Zustand, backend REST APIs, and WebSockets.

## 1. Non-Negotiable Rules

1. Keep every application source file at or below **150 physical lines**,
   including components, hooks, stores, utilities, and tests.
2. Use TypeScript in strict mode. Do not introduce `any`, unsafe casts, or
   non-null assertions to silence type errors.
3. Default to Server Components. Add `"use client"` only at the smallest
   boundary that needs browser APIs, state, effects, or event handlers.
4. Keep backend access behind typed API and WebSocket modules. Components must
   not construct endpoints, parse transport envelopes, or manage credentials.
5. Use Zustand only for genuinely shared client state. Keep local UI state in
   the owning component and shareable navigation state in the URL.
6. Tailwind is the styling system. Reuse tokens and established primitives;
   do not add one-off CSS or a second styling framework without a requirement.
7. Accessibility, responsive behavior, loading, empty, error, and reconnecting
   states are part of feature completion.
8. Make the smallest correct change and avoid unrelated refactoring.

The 150-line limit is a design constraint, not a reason to compress JSX or
reduce readability. Split files by responsibility before reaching the limit.
Generated and third-party files are outside application code; all authored
source and test files must comply.

## 2. Agent Workflow

Before changing code, the agent must:

1. Read the request and identify the route, feature, component, store, and data
   boundary that own the behavior.
2. Trace server rendering, client hydration, REST calls, WebSocket messages,
   state updates, and user-visible failure paths.
3. Search for existing components, hooks, tokens, schemas, and API functions.
4. Check the line count of every file that may be edited.
5. Confirm the backend contract instead of guessing fields or message shapes.
6. State assumptions that materially affect behavior, risk, or scope.
7. Define focused verification, including the relevant viewport and states.

Before finishing, the agent must run formatting if configured, linting, type
checking, tests, a production build when relevant, and the source-file line
limit check. It must report what changed, why that layer owns the behavior, and
what was verified.

## 3. Recommended Project Shape

```text
app/
  (dashboard)/
    orders/
      page.tsx             # route composition
      loading.tsx
      error.tsx
features/
  orders/
    components/            # feature-specific presentation
    hooks/                 # feature orchestration
    store.ts               # only shared client state
    types.ts               # domain-facing UI types
components/
  ui/                      # reusable visual primitives
lib/
  api/                     # typed REST transport
  websocket/               # connection and protocol adapters
  validation/              # boundary validation
  config/                  # public runtime configuration
```

Organize code by product feature. Shared UI primitives belong in `components/ui`;
feature-specific components stay with their feature. Avoid broad dumping-ground
folders and files named `utils.ts`, `helpers.ts`, or `common.ts`.

Dependency direction:

```text
route -> feature component -> feature hook/store -> typed transport -> backend
                 |                                      |
                 +-> shared UI primitive                +-> REST/WebSocket
```

Routes compose features and own route-level metadata, loading, and error
boundaries. They should not contain large component implementations or protocol
logic.

## 4. TypeScript and React Standards

- Use strict, explicit types at external boundaries and allow safe inference
  inside small functions.
- Prefer `unknown` plus validation over `any` for untrusted data.
- Model finite states with discriminated unions instead of multiple booleans.
- Keep domain types distinct from raw transport payloads when their meaning or
  representation differs.
- Use named exports except where Next.js requires a default export.
- Keep components focused on one responsibility and use descriptive names.
- Derive values during render when possible; do not mirror props in state.
- Use effects only to synchronize with external systems. Do not use effects for
  ordinary calculations or event-driven logic.
- Clean up timers, listeners, subscriptions, requests, and sockets.
- Do not prematurely add `useMemo`, `useCallback`, or memoization. Optimize from
  measurements or a clear referential-stability requirement.
- Use stable domain identifiers as keys; never use an array index for mutable
  collections.
- Avoid prop drilling through many layers; prefer composition first, then a
  narrowly scoped store or context when ownership is truly shared.
- Never mutate props, store objects, or arrays in place.

Split large components into behavior hooks, small visual components, and typed
boundary modules. Do not create fragments with unclear ownership merely to meet
the file limit.

## 5. State Ownership

Choose state ownership in this order:

1. Server-rendered data for data needed to build the initial route.
2. URL search parameters for filters, sorting, tabs, and views users may share,
   bookmark, or navigate with browser history.
3. Component state for temporary state owned by one subtree.
4. Zustand for client state shared across distant components or routes.
5. The backend for authoritative business state.

Do not copy the same state into props, component state, and Zustand. Store the
minimum source of truth and derive the rest. Zustand stores must expose focused
selectors and domain actions; components must not subscribe to an entire store
when they need one field.

Keep transport mechanics out of stores. REST clients and WebSocket adapters
validate and normalize data, while store actions apply meaningful domain
updates. Define reset behavior for logout, account changes, and route lifecycle.
Do not persist Zustand state unless the product requires it; version and migrate
persisted state when persistence is necessary.

## 6. REST API Standards

- Centralize base URLs, authentication, headers, serialization, and error
  normalization in the API layer.
- Expose typed functions named by user or domain operation, not raw endpoints.
- Validate untrusted response payloads at the boundary when correctness or
  compatibility matters.
- Propagate `AbortSignal` and cancel obsolete requests on navigation or input
  changes.
- Represent loading, empty, error, unauthorized, and stale states explicitly.
- Do not retry non-idempotent requests automatically. Bound safe retries and
  show the user when an operation remains uncertain.
- Prevent duplicate submissions and provide idempotency keys when supported.
- Never expose secrets in browser code or `NEXT_PUBLIC_*` variables.
- Do not hide backend contract mismatches with fallback fields or unsafe casts.

Server Components may call server-safe API clients. Client Components must use
browser-safe clients and must not import server-only modules, secrets, or Node.js
dependencies.

## 7. WebSocket Standards

- Keep connection lifecycle and protocol parsing in a dedicated adapter or hook.
- Define versioned, discriminated message types for inbound and outbound data.
- Treat every incoming message as untrusted and validate before updating state.
- Maintain one intentional connection per stream scope; avoid a connection per
  rendering component.
- Handle connecting, open, reconnecting, closed, unauthorized, and failed states.
- Reconnect with bounded exponential backoff and jitter; stop on unmount,
  logout, terminal authorization errors, or explicit user action.
- Resubscribe explicitly after reconnect and use sequence numbers or cursors to
  detect gaps, duplicates, and out-of-order events.
- Reconcile snapshots and incremental events deterministically. The latest
  socket event must not be overwritten by an older REST response.
- Render high-frequency stream data at no more than **1 Hz per logical stream**,
  even if the server sends faster. Keep only the latest update in each one-second
  window; never queue stale frames for later rendering.
- Apply the 1 Hz limit in the WebSocket adapter or feature hook before Zustand or
  React updates. Do not implement independent timers in individual components.
- Apply correctness-critical events such as order status, execution,
  authorization, errors, and connection state immediately; never delay them
  behind the visual data throttle.
- Bound client queues and update frequency to prevent excessive renders.
- Close sockets, timers, listeners, and retry loops during cleanup.
- Surface stale or disconnected data honestly; never present it as live.

Authentication material should use secure cookies when the architecture allows
it. Never log tokens or include long-lived secrets in WebSocket URLs.

## 8. Tailwind and Design Standards

- Use the established spacing, color, typography, radius, and breakpoint tokens.
- Prefer reusable variants or primitives for repeated visual patterns.
- Keep class lists readable and colocated with the element they style.
- Use a class-merging helper when conditional utilities may conflict.
- Avoid arbitrary values when a design token expresses the same intent.
- Design mobile-first and verify narrow, medium, and wide layouts.
- Prevent layout shift by reserving space for loading media and data regions.
- Support dark mode only through the project's established token strategy.
- Do not encode business state using color alone.

## 9. Accessibility and User Experience

- Use semantic HTML before ARIA.
- Every interactive element must work by keyboard and show visible focus.
- Buttons perform actions; links navigate. Do not use clickable generic elements.
- Inputs need programmatic labels, helpful validation, and associated errors.
- Dialogs require focus management, escape handling, and focus restoration.
- Announce important asynchronous status changes without excessive noise.
- Respect reduced-motion preferences and maintain sufficient contrast.
- Give destructive actions confirmation or a practical undo path.
- Preserve user input through recoverable failures where safe.

## 10. Performance, Security, and Observability

Keep client bundles small by preserving Server Component boundaries and loading
large browser-only features only where used. Optimize measured bottlenecks,
virtualize genuinely large lists, and avoid rerendering entire dashboards for a
single streaming update.

Escape or sanitize untrusted rich content. Avoid `dangerouslySetInnerHTML`.
Rely on backend authorization; hiding a control is not access control. Keep
sensitive data out of logs, analytics, local storage, error messages, and URLs.

Capture actionable client errors with route, operation, release, and correlation
IDs while excluding sensitive data. Measure meaningful user experience and
WebSocket health, including reconnect count, message lag, dropped updates, and
stale-data duration.

## 11. Testing and Required Checks

Test behavior visible to users rather than component implementation details.
Use unit tests for pure transformations and store actions, component tests for
interactions and accessibility, contract tests for transport mapping, and a
small number of end-to-end tests for critical flows.

Include loading, empty, error, unauthorized, slow response, reconnect, duplicate
event, stale snapshot, keyboard, and responsive cases when relevant.

Minimum local or CI checks:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test                 # when a test runner is configured
pnpm build
```

CI must fail when an authored TypeScript or JavaScript source file exceeds 150
lines. The repository check should inspect tracked `*.ts`, `*.tsx`, `*.js`, and
`*.jsx` files, exclude only generated and third-party content, print offending
paths and counts, and exit non-zero.

## 12. Definition of Done

A UI change is complete only when:

- behavior belongs to the correct route, feature, component, hook, or store;
- no authored source file exceeds 150 lines;
- server/client boundaries and state ownership are deliberate;
- REST and WebSocket data are typed, validated, and failure-aware;
- streaming data renders at no more than 1 Hz while critical events stay
  immediate;
- reconnects, races, cleanup, stale data, and duplicate events are handled;
- loading, empty, error, unauthorized, and responsive states are complete;
- keyboard access, semantics, focus, labels, and contrast are verified;
- linting, type checking, focused tests, and the relevant build pass;
- no secret or sensitive data can reach the client or its telemetry;
- the agent reports unverified assumptions and remaining risks.
