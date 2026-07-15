# Bushi — Launch Runbook

The single, ordered checklist to take Bushi from a fresh Cloudflare account to a
working production deployment. Pairs with `pre-launch-audit.md` (findings) — this
is the "how to actually ship" companion.

> Most of the audit's blockers are now fixed in code and automated in
> `.github/workflows/deploy.yml` (migrations + R2 provisioning + prod vars run on
> every deploy). The steps below are the parts that still need a human: secrets,
> variables, DNS/email verification, and the one-time admin bootstrap.

---

## 1. One-time Cloudflare account setup

These resources are referenced by hardcoded id/name in `apps/api/wrangler.toml`.
Create them once (or update the ids to match your account):

- [ ] **D1**: `wrangler d1 create bushi-db` → paste `database_id` into wrangler.toml.
- [ ] **KV**: create `CACHE` and `FEATURE_FLAGS` namespaces → paste the ids.
- [ ] **R2**: buckets `bushi-assets` and `bushi-generated` — the deploy creates these
      automatically now, but you can pre-create them.
- [ ] **Queue** `bushi-jobs` and **Vectorize** `bushi-search` — the deploy ensures
      these too.
- [ ] **Email Routing**: verify the sender domain (e.g. `bushi.app`) so the native
      `send_email` binding can send. Without this, password-reset / CRM emails fail
      silently. See Cloudflare → Email → Email Routing.

## 2. GitHub Actions — secrets (Settings → Secrets and variables → Actions → Secrets)

- [ ] `CLOUDFLARE_API_TOKEN` — Workers Scripts:Edit, KV:Edit, D1:Edit, R2:Edit,
      Queues:Edit, Vectorize:Edit, Pages:Edit, Workers AI:Read, Account:Read.
- [ ] `CLOUDFLARE_ACCOUNT_ID`
- [ ] `ELEVENLABS_API_KEY` — only needed to (re)build the hero video.

## 3. GitHub Actions — variables (same screen → Variables tab)

- [ ] `VITE_API_BASE` — **required**; the deployed Worker URL
      (e.g. `https://bushi.<sub>.workers.dev`). The web build fails without it.
- [ ] `APP_BASE_URL` — the production site origin (Pages URL or custom domain).
      Injected as a Worker var so billing/redirect/share URLs are correct.
- [ ] `VITE_HERO_VIDEO_URL` / `VITE_HERO_VIDEO_POSTER` — optional (hero band).
- [ ] `VITE_MAPBOX_TOKEN` — optional (CRM customer map).

## 4. Worker secrets (`cd apps/api && wrangler secret put <NAME>`)

- [ ] `SESSION_SECRET` — set a long random value (reserved; see note in audit L2).
- [ ] `PERPLEXITY_API_KEY` — enables the discovery cron + on-demand web search.
      Without it discovery no-ops cleanly.
- [ ] `ADMIN_BOOTSTRAP_TOKEN` — a long random value; enables the one-time admin
      bootstrap in step 6. **Unset it again after step 6.**
- [ ] Billing (only if launching paid plans):
      `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
      `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO` (real `price_…` ids).
      Point the Stripe webhook at `POST <worker>/api/billing/webhook`.

## 5. Deploy

- [ ] Push to `main` (or run the **Deploy to Cloudflare** workflow). It:
      typechecks + tests → ensures Vectorize/Queue/R2 → **applies D1 migrations
      (remote)** → deploys the Worker with `ENVIRONMENT=production` + `APP_BASE_URL`
      → builds the web app with the `VITE_*` vars → deploys Pages.
- [ ] Verify `GET <worker>/api/health` returns `{"environment":"production"}`.

## 6. Bootstrap a platform admin (one-time)

The super-admin CRM requires the `platform_admin` role, which no one has on a fresh
DB. After deploying with `ADMIN_BOOTSTRAP_TOKEN` set:

1. [ ] Sign up normally in the app to create your user + personal org.
2. [ ] Grant yourself the role:
   ```bash
   curl -X POST "$WORKER/api/auth/bootstrap-admin" \
     -H 'content-type: application/json' \
     -d '{"token":"<ADMIN_BOOTSTRAP_TOKEN>","email":"you@example.com"}'
   ```
3. [ ] `wrangler secret delete ADMIN_BOOTSTRAP_TOKEN` (closes the door).
4. [ ] Sign out/in; `/admin/crm` is now reachable.

## 7. Do NOT seed production

`db:seed:remote` loads demo tournaments and login-disabled demo users. An empty
prod DB is correct — public pages handle it cleanly. Skip seeding.

## 8. Post-launch verification

- [ ] Sign up → create a tournament (wizard POSTs to `/api/tournaments`).
- [ ] Open a public tournament page at a real slug; confirm an unknown slug 404s.
- [ ] Password reset: request a link, confirm the email arrives, reset, sign in.
- [ ] (If billing) run a test checkout; confirm the webhook updates the subscription.
- [ ] Live scoring: open a mat as scorekeeper (must be signed in + an org
      organizer); confirm anonymous `?role=organizer` is rejected.

---

## Known deferred items (safe to launch without; tracked for fast-follow)

These are degraded-gracefully, not broken:

- **Semantic search (Vectorize)** — search is keyword-only today; the Vectorize
  index isn't populated/queried. Don't advertise "semantic search" until wired.
- **Marketing Workflows / Browser-rendered assets / Bitoku sync** — disabled
  (commented bindings / no-op jobs). No code path assumes they exist.
- **Some in-app pages** (Dashboard, Coach, Tournament detail, Schools) still render
  demo data even in API mode; they sit behind the auth guard. Wire to live data
  before heavy use.
- **`SESSION_SECRET`** is reserved but unused (session tokens are random+hashed, so
  this isn't a weakness — just don't rely on it signing anything).
