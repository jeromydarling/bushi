# Roadmap

Bushi is built in phases: get the competition core genuinely working, then light
up each scaffolded Cloudflare capability as its resources and keys come online.
This is an honest snapshot — see the "Current status" section of the
[root README](../README.md) for the working-vs-scaffolded breakdown.

---

## Phase 0 — Foundation (done)

- [x] pnpm monorepo (`apps/*`, `packages/*`), TS strict + `noUncheckedIndexedAccess`.
- [x] `@bushi/domain` — roles, statuses, styles, Zod schemas, live-scoring wire protocol.
- [x] `@bushi/db` — D1 migrations 0001–0006, typed row helpers, deterministic seed generator (validated, zero FK violations).
- [x] `@bushi/brackets` — single elimination (byes, seeding, bronze), round robin (standings), `pool_to_bracket` scaffold. **12 passing tests.**
- [x] `@bushi/config` — shared Tailwind design-system preset.
- [x] `@bushi/api` — Hono Worker with auth, tournaments, schools, registrations, live, public, billing, ai, admin routes + queue consumer.
- [x] Auth — PBKDF2 sessions, 30-day cookies, auto-created personal org on signup.
- [x] `MatRoom` DO — WebSocket hibernation, role tags, validated events, clock/periods, presence, durable persistence.
- [x] Public/SEO discovery endpoints.

---

## Phase 1 — Activate the edge services (near-term)

These are implemented behind interfaces and need real Cloudflare resources / keys.

- [ ] **Pool-to-bracket qualifier wiring.** `generateBracket('pool_to_bracket')`
      currently behaves as a single round-robin pool. Implement multi-pool
      splitting and seed the qualifiers into a single-elimination playoff (the
      documented next iteration in `@bushi/brackets`).
- [ ] **Live Stripe billing.** Swap the `/api/billing` stubs for the full
      `@bushi/payments` flow: real Checkout sessions, billing portal, and webhook
      signature verification (`t=...,v1=...` HMAC-SHA256). Persist subscription
      state transitions.
- [ ] **FLUX asset pipeline.** Wire the `generate_asset` job to `@bushi/ai`
      (`generateImage`, FLUX schnell) using the prompts in
      [`ai-prompts.md`](./ai-prompts.md); store outputs in the `GENERATED` R2
      bucket and record them in `generated_assets`.
- [ ] **Vectorize indexing job.** Extend the `index_entity` consumer to compute an
      embedding (`bge-base-en-v1.5`) and upsert into the `bushi-search` index, so
      `@bushi/search.semanticSuggest` returns real results alongside D1 keyword
      search.
- [ ] **Browser Rendering cards.** Render `@bushi/rendering` templates (result
      cards, leaderboards, posters, OG images, certificates) to image/PDF and
      store in R2; attach OG images to public tournament/result pages.
- [ ] **Email activation.** Back `@bushi/notifications` with a real send binding /
      `RESEND_API_KEY`; enqueue `send_email` on registration confirmation, invites
      and reminders.

---

## Phase 2 — Lifecycle automation & integration (later)

- [ ] **Cloudflare Workflows.** Bundle and enable the four `@bushi/marketing`
      workflows (`PreEventPromotion`, `PostEventContent`, `CompetitorOnboarding`,
      `SchoolClaim`), injecting AI + notification services; surface progress via
      the `WORKFLOW_PLANS` admin view and the `campaigns` / `content_jobs` tables.
- [ ] **Bitoku sync.** Configure `@bushi/integrations` with a Bitoku base URL +
      API key to import school rosters, sync athlete profiles, and push results
      back — the sibling loop with [bitoku.app](https://bitoku.app).
- [ ] **Mobile spectator polish.** Refine the read-only live scoreboard / display
      experience (presence, reconnection, low-bandwidth updates) for the stands.

---

## Beyond

- Discount codes & payouts (schema exists: `discount_codes`, `payout_accounts`,
  `refunds`).
- Weigh-ins & check-in flows surfaced in the command center (tables exist:
  `weigh_ins`, `check_ins`).
- Scheduling & mat assignment (tables exist: `mats`, `tournament_days`,
  `match.mat_id`/`scheduled_at`).
- School rankings engine feeding `school_rankings` from completed results.
- Athlete public profiles (`athlete_public_profiles`) and richer SEO
  (`tournament_tags`, `tournament_location_cache`).

---

## Guiding principle

Every capability lands behind an interface first (so the Worker's call sites stay
stable) and degrades gracefully when its binding is absent (so local dev and demos
never break). Activation is then a matter of provisioning the resource, setting a
key, and flipping the fallback — not reshaping the app.
