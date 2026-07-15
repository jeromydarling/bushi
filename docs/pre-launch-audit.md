# Bushi — Pre-Launch Audit & Punch List

_Generated from a four-dimension codebase sweep (security/auth, backend completeness,
frontend, infra/deploy/data). Grouped by severity. Check items off as they're closed._

> **TL;DR:** The core tournament loop is real and shippable — auth, tournaments,
> brackets, live WebSocket scoring, CRM, and Perplexity discovery all work and
> degrade gracefully. The launch risk is concentrated in **authorization**
> (multi-tenant data isolation), **the deploy pipeline** (it never migrates the DB
> or creates R2 buckets), and **monetization/comms** (Stripe + email are partially
> wired or stubbed). Fix the blockers below before opening the doors.

---

## 🔴 BLOCKERS — must fix before launch

### Security / multi-tenancy
- [ ] **B1. Authorization is not org-scoped → full cross-tenant IDOR.** Roles are the
  flattened set across *all* a user's memberships, and `orgId` is just
  `memberships[0]`; almost no route verifies the target row belongs to the caller's
  org. A logged-in user can create/read/modify **any** org's tournaments, schools,
  athletes. `middleware/auth.ts:36-72`, `routes/tournaments.ts:27,56,70,86,115`,
  `routes/schools.ts:48,57,82`. **Fix:** load each resource, assert
  `resource.org_id === auth.orgId` (membership check for the specific org), and never
  trust client-supplied `organizationId`/`schoolId`.
- [ ] **B2. Live scoring is unauthenticated; role comes from the query string.** The WS
  upgrade + `/init` + `/state` have no auth, and `MatRoom` trusts `?role=`. Anyone can
  connect as `organizer`, post scores/penalties, declare a winner (persisted), or reset
  a match. `routes/live.ts:16-33`, `do/MatRoom.ts:38,42,69,78`. **Fix:** require auth on
  `/api/live/*`, resolve the caller's role server-side, pass a validated role into the DO.

### Deploy / data
- [ ] **B3. Deploy never applies D1 migrations.** `deploy.yml` runs `wrangler deploy` but
  has no remote-migrate step; a fresh/unmigrated `bushi-db` = every DB route 500s.
  **Fix:** add `pnpm --filter @bushi/api db:migrate:remote` before "Deploy Worker" (or
  run manually and verify).
- [ ] **B4. R2 buckets (and KV/D1) aren't provisioned by the pipeline.** `wrangler deploy`
  won't create `bushi-assets` / `bushi-generated`; if absent, deploy fails hard.
  **Fix:** add idempotent `wrangler r2 bucket create` steps (like the Vectorize/Queue
  ones); verify KV/D1 ids resolve in the target account.

### Monetization
- [ ] **B5. Stripe webhook signature is never verified + live checkout uses fake price IDs.**
  Forged `customer.subscription.*` events can flip any org's plan; live checkout posts
  `price_${tier}` (not real Price IDs) → 502. The real verifier and client
  (`packages/payments/webhooks.ts`, `stripe-client.ts`) are built but **unused**.
  `routes/billing.ts:48-95`. **Fix:** import the real client, map tiers → real Price IDs,
  verify the `Stripe-Signature` HMAC against the raw body, handle
  `checkout.session.completed`. _(Only a blocker if billing is on at launch — otherwise
  keep stub mode and defer.)_

### Access / config
- [ ] **B6. No loginable `platform_admin` → the CRM is unreachable.** The only admin is
  seed `user-admin` with `password_hash='seed$disabled'`. **Fix:** bootstrap a real admin
  (valid hash, or grant `platform_admin` to a real signup) as a launch step.
- [ ] **B7. Production ships dev vars.** `wrangler.toml` commits `ENVIRONMENT="development"`
  and `APP_BASE_URL="http://localhost:5173"`; deploy doesn't override them, so billing
  `success_url`/share links point at localhost. **Fix:** set `ENVIRONMENT=production` +
  real `APP_BASE_URL` (via `[env.production]` or CI).
- [ ] **B8. No client-side auth guard.** `/app`, `/admin`, `/admin/crm` load by URL for
  anyone (data is API-gated, UI is not). `App.tsx:46-72`; `Auth.tsx:33-35` even routes
  users into `/app` when the backend is unreachable. **Fix:** add a `RequireAuth` wrapper
  (checks `api.me()`) that redirects to `/login`; drop the "no backend → /app" shortcut.

---

## 🟠 HIGH — fix before or immediately after launch

- [ ] **H1. CORS reflects any origin with credentials.** `index.ts:28`
  `cors({ origin: (o)=>o, credentials:true })`. **Fix:** strict allowlist (`APP_BASE_URL`
  + known origins).
- [ ] **H2. Unauthenticated registration endpoints leak PII / allow spam.**
  `registrations.ts:13,62` — the GET returns registrant names/schools for any tournament
  id; the POST writes with no ownership/open-registration check. **Fix:** require auth,
  validate tournament is public + registration-open + athlete belongs to caller.
- [ ] **H3. Email never actually sends.** Queue `send_email` is a `console.log`; CRM email
  interactions set `emailed=true` without sending; `SEND_EMAIL` binding never invoked.
  `NotificationService`/`CloudflareEmailProvider` are built but unwired. Blocks password
  reset + notifications. **Fix:** wire `packages/notifications`, verify the sender domain
  in Cloudflare Email Routing (manual, non-automatable — add to runbook).
- [ ] **H4. Public detail pages are hardwired to demo data and never 404.**
  `PublicTournament/Results/School` + `TournamentDetail/Schools` do
  `find(slug) || demo[0]!`, so `/t/anything` shows "Bushi Summer Open" to spectators &
  crawlers. **Fix:** fetch by slug, render `NotFound` on miss.
- [ ] **H5. "Create tournament" never POSTs.** `TournamentWizard.tsx:144` just navigates to
  a demo id. **Fix:** call `api.createTournament`, handle result, navigate to the new id.
- [ ] **H6. `VITE_API_BASE` is effectively required.** If unset, the Pages build ships a
  broken API origin. **Fix:** make it required (fail the build if empty).

---

## 🟡 MEDIUM

- [ ] **M1. No rate limiting** on login (brute force), signup (mass accounts),
  `/discover/web` (paid Perplexity call → cost-amplification DoS), `/ai/assistant`
  (Workers AI abuse). Add a KV/DO token bucket; cache the web-search key *before* the
  upstream call.
- [ ] **M2. Password reset is a non-functional stub** (`auth.ts:99-108` discards the token).
  Persist `hashToken(token)` + expiry and enqueue the email before launch (depends on H3).
- [ ] **M3. Signup leaks account existence** (`auth.ts:21` returns 409 for existing email).
  Neutralize or throttle.
- [ ] **M4. Semantic search is fake.** `index_entity` inserts a ref row with no vector;
  `SEARCH_INDEX` (Vectorize) is bound but referenced nowhere; admin `/search` is D1 LIKE.
  `packages/search` unused. Fine to launch keyword-only — just don't advertise semantic.
- [ ] **M5. AI backend isn't called by the frontend.** The AI inputs in `Coach.tsx` /
  `TournamentDetail.tsx` are decorative; no `/api/ai/*` calls in `apps/web`. Wire or hide.
- [ ] **M6. Dead CTAs.** "Register now", "Publish", "Add school", "Import CSV",
  "Contact school/Follow", Coach AI input (no button). Wire or hide pre-launch.
- [ ] **M7. Core app pages are demo-only** (`Dashboard`, `Coach`, `TournamentDetail`,
  `Schools` never call the API). Decide which must be live at launch.
- [ ] **M8. Rendering / Workflows / Bitoku are stubs.** `generate_asset` is a `console.log`;
  `[[workflows]]` are commented out; `@bushi/integrations` is a throwing stub imported
  nowhere. All fine to launch disabled — confirm no code path assumes they exist.
- [ ] **M9. Docs are stale + no single runbook.** Docs say migrations 0001-0006 (now 0008)
  and describe migrate as manual without noting the pipeline skips it. Add a launch
  runbook: migrate → vars → secrets → admin bootstrap → email-domain verify.

---

## 🟢 LOW / polish

- [ ] **L1.** PBKDF2 iterations 100k → ~600k (OWASP). `crypto.ts:6` (one-liner; old hashes
  still verify).
- [ ] **L2.** `SESSION_SECRET` is declared but never used — cookies are unsigned (tokens are
  still unforgeable random+SHA-256). Remove or actually use it.
- [ ] **L3.** Expired/revoked sessions are never pruned (table grows unbounded).
- [ ] **L4.** SEO: public pages set title/description client-side only — no OG/canonical/
  JSON-LD despite the site advertising "structured data." Add to `useSeo` + prerender.
- [ ] **L5.** A11y: search inputs need labels (`Discover`, `Admin`, `Customers`);
  `HeroArt` SVG needs `aria-hidden`.
- [ ] **L6.** Pin Wrangler versions (api pins v3, hero-video.yml uses v4 via npx).

---

## ✅ Verified healthy (no action)
- Parameterized SQL everywhere (no injection); unforgeable session tokens; timing-safe
  password verify; `media.ts` blocks path traversal; no hardcoded live secrets.
- Web typecheck + production build pass; graceful degradation with `VITE_API_BASE` unset
  (demo fallback, friendly notices, MatRoom local simulator).
- `SizzleReel` renders nothing until `VITE_HERO_VIDEO_URL` is set (no broken hero).
- DO migration tag + `new_sqlite_classes=["MatRoom"]`, Queue/Vectorize/AI/Browser bindings
  all consistent with `Env`; `scheduled` + `queue` handlers present.
- Empty prod DB does not crash public pages (`/discover` returns `{results:[]}`).

---

## Required secrets / vars for launch (quick checklist)
**Worker secrets** (`wrangler secret put`): `SESSION_SECRET`, `PERPLEXITY_API_KEY`
(discovery), `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (only if billing is live).
**Worker vars:** `ENVIRONMENT=production`, `APP_BASE_URL=<real domain>`.
**GitHub Actions secrets:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (required);
`ELEVENLABS_API_KEY` (hero video only).
**GitHub Actions variables:** `VITE_API_BASE` (effectively required);
`VITE_HERO_VIDEO_URL` / `VITE_HERO_VIDEO_POSTER` / `VITE_MAPBOX_TOKEN` (optional).
**Manual:** apply D1 migrations · verify R2/KV/D1 exist · verify email sender domain ·
bootstrap a loginable `platform_admin`.
