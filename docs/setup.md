# Local setup

This guide takes you from a fresh clone to a running API + database (and, once
`@bushi/web` lands, the web app) — entirely locally, with **no Cloudflare
account required**. Wrangler simulates D1, KV, R2, Queues and Durable Objects on
your machine, and every optional integration (AI, Stripe, Browser Rendering,
email) falls back to a deterministic stub when its binding/secret is absent.

---

## Prerequisites

- **Node.js `>=20`** — `node --version`
- **pnpm `10.33`** (the repo's `packageManager`). If you have Corepack:
  `corepack enable && corepack prepare pnpm@10.33.0 --activate`. Otherwise
  `npm install -g pnpm@10.33.0`.

No global Wrangler install is needed — it's a dev dependency of `@bushi/api` and
runs via `pnpm`.

---

## 1. Install

```bash
git clone <repo-url> bushi
cd bushi
pnpm install
```

This installs the whole workspace and links the `@bushi/*` packages together via
`workspace:*` references.

### Sanity checks

```bash
pnpm -r typecheck      # strict TS across every package
pnpm -r test           # runs the vitest suites (bracket engine = 12 tests)
```

Run just the bracket engine if you want a fast signal:

```bash
pnpm --filter @bushi/brackets test
```

---

## 2. Generate the seed

The seed is generated deterministically (fixed base time + a seeded PRNG), so it
is reproducible in CI. Run the generator to produce
`packages/db/seed/seed.sql`:

```bash
node packages/db/seed/generate-seed.mjs
```

It emits realistic demo data: ~6 schools, ~66 athletes, 2 tournaments (one in
`registration_open`, one `completed` with matches), divisions, entries, sponsors,
rankings and prompt templates. The output is validated against SQLite with zero
foreign-key violations.

---

## 3. Create the local D1 database (migrate + seed)

All D1 scripts live in [`apps/api/package.json`](../apps/api/package.json) and use
the migrations in `packages/db/migrations` (wired via `migrations_dir` in
`wrangler.toml`).

```bash
# Apply migrations 0001–0006 to a LOCAL D1 (creates .wrangler state on first run)
pnpm --filter @bushi/api db:migrate:local

# Load the demo seed
pnpm --filter @bushi/api db:seed:local
```

Equivalently from the repo root: `pnpm db:migrate:local` and `pnpm db:seed:local`.

> The local database lives under `apps/api/.wrangler/`. Delete that directory to
> reset to a clean slate, then re-run the two commands above.

---

## 4. Run the API

```bash
pnpm dev:api          # wrangler dev — defaults to http://localhost:8787
```

Verify it's up:

```bash
curl http://localhost:8787/api/health
# {"status":"ok","service":"bushi-api","environment":"development"}
```

Try an authenticated flow:

```bash
# Sign up (returns a bushi_session cookie)
curl -i -X POST http://localhost:8787/api/auth/signup \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com","password":"correcthorse1","fullName":"You"}'

# Public discovery (unauthenticated, seeded data)
curl 'http://localhost:8787/api/public/discover?timeframe=upcoming'
```

### Optional: enable Workers AI / Stripe locally
Everything works without them, but if you want the real thing:

- **Workers AI** — `wrangler dev` can proxy to Workers AI when you're logged in
  (`wrangler login`). Without it, `/api/ai/*` returns the deterministic fallback.
- **Stripe** — put `STRIPE_SECRET_KEY` in a `.dev.vars` file in `apps/api/`
  (git-ignored) to exercise live checkout; otherwise `/api/billing/checkout`
  returns a stub URL.

Example `apps/api/.dev.vars`:

```
SESSION_SECRET=dev-only-secret
STRIPE_SECRET_KEY=sk_test_...
```

---

## 5. Run the web app

> `@bushi/web` (React + Vite + Tailwind SPA) is being built by another agent. The
> commands below are wired and ready; run them once the app exists.

```bash
pnpm dev:web          # Vite — http://localhost:5173
```

The API's CORS is configured to reflect the request origin with credentials, so
the SPA on `:5173` can call the API on `:8787` with the session cookie.

---

## Project scripts reference

| Command | Effect |
| --- | --- |
| `pnpm install` | Install the workspace |
| `pnpm -r typecheck` | `tsc --noEmit` across all packages |
| `pnpm -r test` | All vitest suites |
| `pnpm --filter @bushi/brackets test` | Bracket engine tests only |
| `pnpm dev:api` | `wrangler dev` for the Worker |
| `pnpm dev:web` | Vite dev server for the SPA |
| `node packages/db/seed/generate-seed.mjs` | Regenerate `seed.sql` |
| `pnpm db:migrate:local` | Apply migrations to local D1 |
| `pnpm db:seed:local` | Load the seed into local D1 |
| `pnpm build` | Build packages + web |
| `pnpm clean` | Remove `dist`, `node_modules`, caches |

---

## Troubleshooting

**`pnpm install` fails on the package manager version.**
The repo pins `pnpm@10.33.0`. Use Corepack (`corepack prepare pnpm@10.33.0
--activate`) or install that exact version globally.

**`wrangler dev` can't find the D1 database / "no such table".**
You haven't migrated the local DB yet. Run `pnpm db:migrate:local` (and
`pnpm db:seed:local`). Confirm `apps/api/wrangler.toml` still has the
`[[d1_databases]]` block with `database_name = "bushi-db"`.

**Migrations "already applied" but tables are missing.**
Your local `.wrangler` state is out of sync. Delete `apps/api/.wrangler/` and
re-run migrate + seed.

**Seed fails with a foreign-key error.**
Re-generate the seed (`node packages/db/seed/generate-seed.mjs`) and make sure
you applied _all_ migrations first — the seed assumes the full 0001–0006 schema.

**`/api/ai/*` always returns `"status":"fallback"`.**
Expected without a bound/authenticated Workers AI. This is by design so the UI
stays functional offline. Run `wrangler login` (and deploy) to use the real
model.

**`/api/billing/checkout` returns `"mode":"stub"`.**
`STRIPE_SECRET_KEY` isn't set. Add it to `apps/api/.dev.vars` (local) or as a
secret (remote) to switch to live Stripe Checkout.

**Live scoring: "Not permitted to score".**
Connect with a scoring role — `/api/live/:matchId?role=scorekeeper` (or
`referee`/`organizer`). `spectator`/`display` sockets are intentionally
read-only.

**Types resolve locally but a package edit isn't picked up.**
`@bushi/*` packages are linked via `workspace:*`. If a consumer doesn't see a
change, re-run `pnpm install` or restart the dev server / TS server.
