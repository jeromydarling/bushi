# Bushi 武士

**The modern operating system for martial arts tournaments.**

Bushi is a Cloudflare-native SaaS platform that runs the full lifecycle of a
martial arts event — from the moment an organizer opens registration to the last
bracket on the mat and the recap that goes out afterward. It combines a public
discovery layer (SEO tournament pages, school profiles, rankings), an organizer
command center (divisions, seeding, brackets, check-in, weigh-ins), real-time
live scoring, commerce (entry fees, subscriptions), and AI-assisted marketing —
all on a single edge runtime with no origin servers to babysit.

The name is deliberate. A _bushi_ is a disciplined practitioner; the platform
aims for the same qualities — precise, composed, and built to perform under
pressure on event day.

---

## Positioning

Bushi is designed as a **sibling and integration target for
[Bitoku](https://bitoku.app)**, a Lovable-built school management system. Where
Bitoku owns the day-to-day of running a martial arts _school_ (members, ranks,
attendance, billing), Bushi owns the _competition_ side — the tournaments those
schools attend. The two are meant to interoperate: a school's roster in Bitoku
can flow into Bushi as competitors, and results can flow back. That sync surface
is defined in [`@bushi/integrations`](./packages/integrations) and stays behind
an interface until a Bitoku base URL + API key are configured.

---

## Repository structure

Bushi is a **pnpm workspace monorepo** (`apps/*`, `packages/*`).

```
bushi/
├── apps/
│   ├── api/                 @bushi/api  — Cloudflare Worker (Hono) + MatRoom Durable Object
│   │   ├── src/
│   │   │   ├── index.ts     Worker entry: routes + queue consumer
│   │   │   ├── env.ts       Env bindings + JobMessage types
│   │   │   ├── do/MatRoom.ts  Live-scoring Durable Object
│   │   │   ├── routes/      auth, tournaments, schools, registrations,
│   │   │   │                live, public, billing, ai, admin
│   │   │   ├── middleware/  session loading + role guards
│   │   │   └── lib/         crypto (PBKDF2/tokens), http helpers
│   │   └── wrangler.toml    all Cloudflare bindings
│   └── web/                 @bushi/web  — React + Vite + Tailwind SPA (in progress)
├── packages/
│   ├── domain/              @bushi/domain    constants, zod schemas, live-scoring types
│   ├── db/                  @bushi/db        D1 migrations (0001–0006), typed rows, seed generator
│   ├── brackets/            @bushi/brackets  pure bracket engine (+ 12 vitest tests)
│   ├── config/              @bushi/config    shared Tailwind design-system preset
│   ├── auth/                @bushi/auth      PBKDF2 hashing, tokens, sessions, permissions
│   ├── ai/                  @bushi/ai        Workers AI + AI Gateway + Vectorize + FLUX
│   ├── payments/            @bushi/payments  hand-rolled Stripe REST + webhook HMAC verify
│   ├── notifications/       @bushi/notifications  email templates + providers
│   ├── rendering/           @bushi/rendering Browser Rendering → image/PDF → R2
│   ├── search/              @bushi/search    D1 keyword + Vectorize semantic search
│   ├── marketing/           @bushi/marketing Cloudflare Workflows for lifecycle campaigns
│   └── integrations/        @bushi/integrations  Bitoku sync interfaces
└── docs/                    architecture, product, setup, deployment, bindings, roadmap, ai-prompts
```

---

## Stack

- **Runtime:** Cloudflare Workers (`nodejs_compat`), Durable Objects, Queues,
  D1, KV, R2, Workers AI, Vectorize, Browser Rendering, Workflows.
- **API framework:** [Hono](https://hono.dev) 4.
- **Validation / shared types:** [Zod](https://zod.dev) 3 via `@bushi/domain`.
- **Database:** D1 (SQLite) accessed through a thin typed helper — raw SQL, no ORM.
- **Web:** React + Vite + Tailwind SPA (`@bushi/web`), deployed to Cloudflare Pages.
- **Tooling:** pnpm `10.33`, Node `>=20`, TypeScript `strict` +
  `noUncheckedIndexedAccess`, Vitest, Wrangler `3`.

---

## Quick start (local)

```bash
# 1. Install
pnpm install

# 2. Generate the deterministic demo seed (writes packages/db/seed/seed.sql)
node packages/db/seed/generate-seed.mjs

# 3. Apply migrations + seed to a LOCAL D1 (no Cloudflare account needed)
pnpm --filter @bushi/api db:migrate:local
pnpm --filter @bushi/api db:seed:local

# 4. Run the API (wrangler dev) and the web app (Vite) in two terminals
pnpm dev:api      # http://localhost:8787  (health: /api/health)
pnpm dev:web      # http://localhost:5173
```

Local dev works **without any real Cloudflare resources** — Wrangler simulates
D1/KV/R2/Queues/DO, and the AI, Stripe, Browser Rendering and email surfaces all
degrade gracefully to deterministic fallbacks when their bindings/secrets are
absent. See [`docs/setup.md`](./docs/setup.md) for the detailed walkthrough and
troubleshooting.

### Everyday commands

| Task | Command |
| --- | --- |
| Install | `pnpm install` |
| Typecheck everything | `pnpm -r typecheck` |
| Run all tests | `pnpm -r test` |
| Bracket engine tests only | `pnpm --filter @bushi/brackets test` |
| Web dev server | `pnpm dev:web` (http://localhost:5173) |
| API dev server | `pnpm dev:api` (`wrangler dev`) |
| Regenerate seed | `node packages/db/seed/generate-seed.mjs` |
| Local D1 migrate | `pnpm --filter @bushi/api db:migrate:local` |
| Local D1 seed | `pnpm --filter @bushi/api db:seed:local` |

---

## Provisioning Cloudflare resources

Before a remote deploy you must create the backing resources and paste their ids
into [`apps/api/wrangler.toml`](./apps/api/wrangler.toml). Full detail (with the
matching binding table) lives in
[`docs/cloudflare-bindings.md`](./docs/cloudflare-bindings.md) and
[`docs/deployment.md`](./docs/deployment.md).

```bash
# D1 database (paste database_id into wrangler.toml)
wrangler d1 create bushi-db

# KV namespaces (two — CACHE + FEATURE_FLAGS; paste each id)
wrangler kv namespace create CACHE
wrangler kv namespace create FEATURE_FLAGS

# R2 buckets
wrangler r2 bucket create bushi-assets
wrangler r2 bucket create bushi-generated

# Queue
wrangler queues create bushi-jobs

# Vectorize index (768 dims, cosine — matches bge-base-en-v1.5)
wrangler vectorize create bushi-search --dimensions=768 --metric=cosine
```

Durable Objects (`MatRoom`), Workers AI (`AI`) and Browser Rendering (`BROWSER`)
require no pre-creation — they are provisioned by the `wrangler deploy` that
bundles them.

### Secrets

```bash
wrangler secret put SESSION_SECRET
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
# Email uses the native send_email binding — no secret required.
```

### Migrate, seed & deploy (remote)

```bash
pnpm --filter @bushi/api db:migrate:remote
pnpm --filter @bushi/api db:seed:remote      # optional demo data
pnpm --filter @bushi/api deploy              # wrangler deploy
```

The web app deploys separately to **Cloudflare Pages** — see
[`docs/deployment.md`](./docs/deployment.md).

---

## Current status

Bushi is an early-stage but genuinely functional build. Be honest about what is
real versus scaffolded:

### Working today

- **Bracket engine** (`@bushi/brackets`) — single elimination (byes, seeding
  curve, 3rd-place/bronze match), round robin (with standings), and a
  `pool_to_bracket` scaffold. Pure, deterministic, **12 passing Vitest tests**.
- **Database schema** (`@bushi/db`) — 6 migrations (0001–0006) covering identity,
  schools/athletes, tournaments/brackets/matches, commerce, marketing/AI, and
  public/SEO. Typed row helpers + a deterministic seed generator validated
  against SQLite with **zero FK violations**.
- **API** (`@bushi/api`) — Hono Worker with real, mounted routes for auth,
  tournaments, schools, registrations, live scoring, public/SEO discovery,
  billing, AI, and admin; plus a Queue consumer for background side effects.
- **Auth** — cookie sessions (`bushi_session`), PBKDF2 password hashing via
  WebCrypto, 30-day sessions, auto-created personal org on signup.
- **Live scoring** — the `MatRoom` Durable Object: one instance per match,
  WebSocket hibernation, role-based scoring permissions, validated events, a
  clock/period model, presence, and durable persistence via the queue.
- **Domain** (`@bushi/domain`) — shared roles/statuses/styles, Zod schemas, and
  the live-scoring wire protocol used by both server and client.

### Scaffolded — wired through interfaces, needs real resources / keys

These are implemented behind clean interfaces and degrade gracefully in local
dev, but need provisioned Cloudflare resources and/or API keys to fully activate:

- **AI** (`@bushi/ai`) — Workers AI text + FLUX image generation, AI Gateway
  routing, and embeddings. The `/api/ai` routes already call Workers AI with a
  deterministic templated fallback when `AI` is unbound.
- **Stripe** (`@bushi/payments`) — hand-rolled REST client + webhook HMAC verify.
  `/api/billing/checkout` runs in stub mode without `STRIPE_SECRET_KEY` and live
  Stripe Checkout with it.
- **Browser Rendering** (`@bushi/rendering`) — HTML templates → image/PDF → R2 for
  result cards, posters, OG images and certificates.
- **Vectorize search** (`@bushi/search`) — D1 keyword search is live; semantic
  suggestions need the `bushi-search` index and an embedding job.
- **Workflows** (`@bushi/marketing`) — four lifecycle campaigns; the bindings are
  commented in `wrangler.toml` until the workflow classes are bundled.
- **Notifications** (`@bushi/notifications`) — email templates + providers using
  Cloudflare's native `send_email` binding (verify the sender domain in Email Routing).
- **Bitoku integration** (`@bushi/integrations`) — sync interfaces + stubs; no
  live calls until configured.

### Documented next step

- **FLUX marketing image pipeline** — the visual direction and prompts for hero
  art, section illustrations, and OG/result cards are specified in
  [`docs/ai-prompts.md`](./docs/ai-prompts.md); wiring the generation job that
  renders and stores them in R2 is the next milestone.

See [`docs/roadmap.md`](./docs/roadmap.md) for the phased plan.

---

## Documentation

| Doc | What's inside |
| --- | --- |
| [architecture.md](./docs/architecture.md) | System diagram, request flow, live-scoring data flow, package graph, design decisions |
| [product.md](./docs/product.md) | Personas, workflows, tournament lifecycle, supported styles, modules |
| [setup.md](./docs/setup.md) | Detailed local dev from clone to running app + API, troubleshooting |
| [deployment.md](./docs/deployment.md) | Step-by-step Cloudflare deploy, secrets, Stripe webhook, Workflows |
| [cloudflare-bindings.md](./docs/cloudflare-bindings.md) | Every binding: type, purpose, snippet, create command, consumers |
| [roadmap.md](./docs/roadmap.md) | Phased roadmap — done, near-term, later |
| [ai-prompts.md](./docs/ai-prompts.md) | FLUX / Workers AI prompts + visual direction for marketing assets |

---

_Bushi — one arena, every style._ 武士
