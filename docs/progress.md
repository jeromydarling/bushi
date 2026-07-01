# Bushi — Build Progress Log

A running log of milestones, decisions, and next actions. Newest first.

---

## 2026-07-01 — Initial autonomous build

### Milestones
- **Monorepo foundation.** pnpm workspaces (`apps/*`, `packages/*`), strict TypeScript
  base config (`noUncheckedIndexedAccess` on), shared Tailwind design-system preset
  (`@bushi/config`) with the ink / kiai / steel palette and display/JP fonts.
- **Domain package (`@bushi/domain`).** Single source of truth for roles, tournament
  statuses, styles, belt systems, and Zod schemas (auth, org, school, athlete,
  tournament, division, registration, live scoring events). Shared live-scoring wire
  types used by both the Durable Object and the web UIs. 5 passing tests.
- **Database package (`@bushi/db`).** Six D1 migrations covering identity/org,
  schools/athletes, tournaments/brackets/matches, commerce, marketing/AI, and
  public/SEO — with indexes, foreign keys, unique/partial indexes and epoch-ms
  timestamps. Hand-written typed row helpers and a thin `Db` query wrapper.
  Deterministic seed generator produces ~6 schools, 66 athletes, 2 tournaments,
  divisions, completed matches, sponsors, and rankings. **Validated end-to-end
  against SQLite with zero foreign-key violations.**
- **Bracket engine (`@bushi/brackets`).** Pure, deterministic engine: single
  elimination with correct seeding (top seeds separated), automatic bye handling and
  cascade, result propagation, 3rd-place match, and round robin with circle-method
  scheduling + standings. **12 passing tests.**
- **Cloudflare Worker API (`@bushi/api`).** Hono app with cookie sessions (PBKDF2 via
  WebCrypto), role guards, and real routes for auth, tournaments (incl. bracket
  generation), schools/athletes (incl. CSV import), registrations (caps → waitlist +
  waiver), public discovery/SEO, billing (Stripe stub + live path), AI content
  (Workers AI with deterministic fallback), and admin. Queue consumer for durable
  side effects. `wrangler.toml` wires D1, Durable Objects, KV×2, R2×2, Queues,
  Workers AI, Vectorize, and Browser Rendering. 3 passing crypto tests.
- **Live scoring (`MatRoom` Durable Object).** One instance per match using the
  WebSocket hibernation API; validates scoring events, maintains score + clock +
  periods, enforces scorer roles, broadcasts state frames, persists to DO storage,
  and enqueues match-result persistence.
- **Supporting packages.** `@bushi/auth`, `@bushi/ai`, `@bushi/payments`,
  `@bushi/notifications`, `@bushi/rendering`, `@bushi/search`, `@bushi/marketing`
  (four Cloudflare Workflows), and `@bushi/integrations` (Bitoku sync interfaces) —
  all compiling with clean interfaces against their Cloudflare bindings.
- **Web app (`@bushi/web`).** React + Vite + Tailwind marketing site and application
  shell (organizer/school/coach dashboards, tournament wizard, mat scoring room with
  live WebSocket + local simulator fallback, public tournament/school pages,
  discovery, admin).

### Decisions
- **Raw SQL + hand-written row types instead of an ORM.** Keeps the Worker bundle
  small, the SQL explicit, and avoids a codegen step in the Worker build.
- **A Durable Object per match** (not per mat) so live state, reconnection, and
  persistence are isolated and horizontally scalable; the mat number is carried in
  state for display grouping.
- **The bracket engine is pure and dependency-free** so it is exhaustively testable
  and reusable on the Worker, in the browser, and in background jobs.
- **AI and billing degrade gracefully** — deterministic fallbacks when Workers AI or
  Stripe keys are absent — so the product is demoable before any external setup.
- **Seed is deterministic** (fixed PRNG + fixed base time) for reproducible demos/CI.

### Blockers avoided
- Non-power-of-two brackets handled via top-seed byes with a cascade pass rather than
  padding the field with fake competitors.
- Cross-package type friction resolved by exporting from `src/index.ts` (no build step
  required between workspace packages during typecheck).

### Next actions
- Wire pool-to-bracket qualifiers into a single-elim playoff.
- Activate live Stripe (products/prices), FLUX marketing image pipeline into R2, the
  Vectorize indexing job, Browser Rendering share cards, and email delivery.
- Build the Bitoku roster/result sync against real endpoints.
