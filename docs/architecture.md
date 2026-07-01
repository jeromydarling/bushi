# Architecture

Bushi runs entirely on Cloudflare's edge. There is no origin server, no
long-lived VM, and no separate database host — the Worker _is_ the application,
and every stateful dependency is a Cloudflare primitive bound directly into it.

---

## System diagram

```
                            ┌──────────────────────────────────────────┐
                            │            Cloudflare edge                │
                            │                                           │
  Browser / Spectator ──────┼──▶  @bushi/web (Pages, React SPA)         │
                            │        │  fetch /api/*                    │
                            │        ▼                                  │
  Scorekeeper / Referee ────┼──▶  @bushi/api  (Worker, Hono)            │
        (WebSocket)         │        │                                  │
                            │        ├── middleware: loadSession        │
                            │        │                                  │
                            │        ├── /api/auth         ┐            │
                            │        ├── /api/tournaments  │            │
                            │        ├── /api/schools      │            │
                            │        ├── /api/registrations│  routes    │
                            │        ├── /api/public       │            │
                            │        ├── /api/billing      │            │
                            │        ├── /api/ai           │            │
                            │        ├── /api/admin        ┘            │
                            │        │                                  │
                            │        └── /api/live/:matchId ──▶ MatRoom │
                            │                                  (DO)     │
                            │                                    │      │
                            │   bindings ▼         ▼      ▼       ▼      │
                            │  ┌──────┬──────┬─────────┬───────────┐    │
                            │  │  D1  │  KV  │   R2    │   Queue    │    │
                            │  │  DB  │ CACHE│ ASSETS  │   JOBS     │    │
                            │  │      │ FLAGS│GENERATED│ (consumer) │    │
                            │  └──────┴──────┴─────────┴───────────┘    │
                            │  ┌──────────┬───────────┬─────────────┐   │
                            │  │Workers AI│ Vectorize │ Browser Rndr │   │
                            │  │   AI     │SEARCH_INDEX│  BROWSER    │   │
                            │  └──────────┴───────────┴─────────────┘   │
                            └──────────────────────────────────────────┘
```

The same Worker script exports two entry points (see
[`apps/api/src/index.ts`](../apps/api/src/index.ts)):

- `fetch` — the Hono app, handling every HTTP + WebSocket request.
- `queue` — the consumer that drains the `bushi-jobs` queue for async side
  effects.

It also re-exports the `MatRoom` Durable Object class so Wrangler can bind it.

---

## Request flow (HTTP)

1. A request hits the Worker's `fetch` handler (the Hono `app`).
2. Global middleware runs: permissive credentialed CORS, then
   [`loadSession`](../apps/api/src/middleware/auth.ts). `loadSession` reads the
   `bushi_session` cookie (or a `Bearer` token), hashes it, looks up the
   `sessions` row joined to `users`, checks expiry/revocation, loads the user's
   `organization_memberships`, and attaches an `AuthContext` (`userId`, `email`,
   `roles`, `orgId`) to the context. It never rejects on its own — public routes
   still see an optional session.
3. The request is dispatched to a mounted sub-router (`/api/auth`,
   `/api/tournaments`, …). Guarded routes add `requireAuth` or
   `requireRole(...)` middleware.
4. Handlers validate input with a Zod schema from `@bushi/domain`
   (`parseBody`), execute raw SQL through the `@bushi/db` `Db` helper, and return
   JSON.
5. Errors thrown as `HttpError` become structured JSON responses; anything else
   is logged and returned as a 500.

---

## Data flow: live scoring

Live scoring is the most interesting path because it is stateful and real-time.
Each match gets its own Durable Object instance, addressed by match id.

```
 Scorekeeper UI                 Worker                    MatRoom DO            Queue        D1
      │                           │                          │                   │           │
      │  WS  /api/live/:matchId   │                          │                   │           │
      │──────────────────────────▶│  idFromName(matchId)     │                   │           │
      │                           │  .get(id).fetch(req) ────▶│  acceptWebSocket  │           │
      │                           │                          │  (tag=role)       │           │
      │◀───────────  101 + state frame  ──────────────────────│                   │           │
      │                           │                          │                   │           │
      │  {type:"score",...}  ─────────────────────────────────▶ validate (zod)   │           │
      │                           │                          │  applyEvent       │           │
      │                           │                          │  persist(storage) │           │
      │◀──────── broadcast {type:"state", state} ─────────────│  (all sockets)    │           │
      │                           │                          │                   │           │
      │  {type:"result",...} ─────────────────────────────────▶ enqueue ─────────▶│           │
      │                           │                          │  persist_match_result         │
      │                           │                          │                   │──── UPDATE ▶│
      │                           │                          │                   │  matches SET │
      │                           │                          │                   │  winner...   │
```

Key properties (see [`apps/api/src/do/MatRoom.ts`](../apps/api/src/do/MatRoom.ts)
and [`packages/domain/src/live.ts`](../packages/domain/src/live.ts)):

- **One DO per match.** `MAT_ROOM.idFromName(matchId)` deterministically maps a
  match id to a single instance, so all scorekeepers, displays and spectators for
  that match converge on the same authoritative state.
- **WebSocket hibernation.** The DO uses `acceptWebSocket` + the hibernation
  handlers (`webSocketMessage`, `webSocketClose`, `webSocketError`). It can be
  evicted from memory between events and restored from storage without dropping
  connections.
- **Role tags.** Each socket is accepted with its role as a tag
  (`scorekeeper`/`referee`/`organizer`/`display`/`spectator`). Only
  scorekeeper/referee/organizer may mutate score; everyone else is read-only.
- **Validated events.** Inbound frames are parsed with `scoringEventSchema`
  (discriminated union: `score`, `penalty`, `timer`, `period`, `result`,
  `reset_match`) before they touch state.
- **Authoritative state + clock.** The DO owns `LiveMatchState` — score,
  penalties, a wall-clock-accurate period timer, and result. A monotonic
  `version` lets clients drop out-of-order frames.
- **Durable persistence.** State is written to DO storage on every change
  (survives hibernation). On a `result`, the DO enqueues a
  `persist_match_result` job; the Worker's queue consumer writes the outcome back
  to the `matches` table. The enqueue is best-effort so local dev without a bound
  queue still works.

The REST helpers `/api/live/:matchId/init` (seed fighters + clock) and
`/api/live/:matchId/state` (snapshot for public results hydration) forward to the
same DO through its `fetch` control plane.

---

## Background jobs (Queue)

The Worker is both producer and consumer of `bushi-jobs`. `JobMessage` (defined
in [`apps/api/src/env.ts`](../apps/api/src/env.ts)) is a tagged union:

| Kind | Producer | Consumer action |
| --- | --- | --- |
| `persist_match_result` | `MatRoom` on a `result` event | `UPDATE matches` with winner/method/completed_at |
| `index_entity` | (future) entity writes | upsert a `search_embeddings_refs` row; Vectorize upsert is the next step |
| `send_email` | (future) registration/reminders | delegated to `@bushi/notifications` |
| `generate_asset` | (future) marketing/rendering | delegated to `@bushi/rendering` |

The consumer acks on success and retries on throw, with a batch size of 10 and a
30-second batch timeout.

---

## Why Cloudflare-native

- **No origin, global by default.** The Worker runs in every Cloudflare pop, so
  discovery pages, registration, and live scoring are close to competitors and
  spectators wherever the event is.
- **Durable Objects fit live scoring exactly.** A tournament is a fan-out of
  many simultaneous, independent matches. A DO-per-match model gives each mat its
  own single-writer state machine with built-in coordination and hibernation —
  no external pub/sub, no sticky-session load balancer.
- **D1 is a real relational store at the edge.** The schema uses foreign keys,
  unique/partial indexes and transactions; SQLite semantics are a good match for
  event-scoped, moderately sized datasets.
- **The rest of the toolbox is already bound in.** KV (hot lookups, feature
  flags), R2 (assets + generated media), Queues (async fan-out), Workers AI +
  Vectorize (copy, embeddings, semantic search), Browser Rendering (share cards
  and PDFs) and Workflows (multi-step campaigns) are all first-class bindings —
  no separate infra to run or secure.
- **One deploy artifact.** `wrangler deploy` ships the API, the DO, and the queue
  consumer together; the SPA ships to Pages.

---

## Package dependency graph

```
                         ┌─────────────────┐
                         │  @bushi/domain  │  constants, zod schemas, live types
                         └───────┬─────────┘
             ┌───────────────────┼───────────────────────────┐
             ▼                   ▼                            ▼
     ┌──────────────┐   ┌────────────────┐          (consumed by many)
     │ @bushi/db    │   │ @bushi/brackets│
     │ D1 + rows    │   │ pure engine    │
     └──────┬───────┘   └───────┬────────┘
            │                   │
            └─────────┬─────────┘
                      ▼
              ┌───────────────┐
              │  @bushi/api   │  Hono Worker + MatRoom DO + queue consumer
              └───────────────┘

  Scaffolding packages (interface-typed, injected by the Worker in the full build):
    @bushi/auth  @bushi/ai  @bushi/payments  @bushi/notifications
    @bushi/rendering  @bushi/search  @bushi/marketing  @bushi/integrations

  @bushi/config  →  shared Tailwind preset (consumed by @bushi/web)
```

Today `@bushi/api` depends directly on `@bushi/domain`, `@bushi/db` and
`@bushi/brackets` (see [`apps/api/package.json`](../apps/api/package.json)). The
scaffolding packages are deliberately standalone and interface-typed so they can
be wired into the Worker without reshaping call sites as each Cloudflare resource
is provisioned.

---

## Design decisions

### Raw SQL over an ORM
`@bushi/db` is a ~40-line typed wrapper (`all`, `first`, `run`, `batch`) over the
D1 binding. Reasons: the Worker bundle stays small, the SQL stays obvious and
reviewable, and D1's `batch()` gives atomic multi-statement writes without an
ORM's abstraction. Row shapes are captured as `*Row` types in
`packages/db/src/rows.ts` so call sites are still typed.

### Durable Object per match
Rather than a single coordinator or an external realtime service, each live match
is its own DO. This gives natural sharding (thousands of concurrent matches, each
independent), single-writer consistency for scoring, and hibernation so idle mats
cost nothing. Roles are enforced with socket tags rather than a separate auth
round-trip.

### Pure, deterministic bracket engine
`@bushi/brackets` has no I/O and no randomness beyond an injectable seed. That
makes it exhaustively unit-testable (12 tests) and reusable identically on the
Worker, in the browser, and in background jobs. The API layer persists the
engine's JSON output into the `brackets` table (`ON CONFLICT(division_id) DO
UPDATE`), so regenerating a bracket is idempotent per division.

### Workspace layout
Domain contracts (constants, schemas, live-scoring protocol) live in one package
(`@bushi/domain`) so the API, the DO, the web app, and every service package
share a single source of truth for roles, statuses, styles and the wire format.
Cross-cutting capabilities (auth, ai, payments, rendering, search, notifications,
marketing, integrations) are separate packages with their own READMEs, each
declaring exactly which Cloudflare bindings/secrets it expects — so the surface
area required to activate each one is explicit.

### Graceful degradation
Optional bindings (`AI`, `SEARCH_INDEX`, `BROWSER`) and secrets
(`STRIPE_SECRET_KEY`, `RESEND_API_KEY`, …) are typed as possibly-undefined in
`Env`. Route handlers check for them and fall back to deterministic stubs, so the
whole app is demoable end-to-end in local dev with zero external accounts.
