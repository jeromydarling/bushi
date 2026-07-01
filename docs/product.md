# Product

Bushi is the operating system for martial arts tournaments — the software an
organizer opens on their laptop to plan an event, the tablet a scorekeeper holds
at the mat, the page a competitor registers on, and the live results a spectator
refreshes from the stands.

---

## Personas & roles

Roles are defined once in
[`packages/domain/src/constants.ts`](../packages/domain/src/constants.ts) (`ROLES`)
and enforced by the API's `requireRole` middleware and the `MatRoom` socket tags.

| Role | Who they are | What they do in Bushi |
| --- | --- | --- |
| **platform_admin** | Bushi operators | Cross-org search, audit logs, feature flags (`/api/admin`) |
| **organizer** | Runs the event / owns the org | Creates tournaments, divisions, seeds brackets, opens registration, runs the command center |
| **school_admin** | Manages a school's presence | Maintains the school roster, claims the public school profile, registers athletes |
| **coach** | Coaches competitors | Registers/checks in their squad, views brackets and schedules |
| **referee** | Officiates a match | Can score and issue penalties in the live MatRoom |
| **scorekeeper** | Runs the table for a mat | Drives the clock and scoreboard in the live MatRoom |
| **competitor** | The athlete | Registers, accepts the waiver, sees their bracket and results |
| **spectator** | Everyone else | Read-only live scoreboards, public discovery, results, rankings |

`STAFF_ROLES` (`platform_admin`, `organizer`, `referee`, `scorekeeper`) are the
roles permitted to operate inside the organizer command center. In the live
`MatRoom`, `scorekeeper`, `referee` and `organizer` may mutate score; all other
tags are read-only.

Every new signup is automatically given a **personal organization** with an
`organizer` membership and a `free` subscription, so a user can start building a
tournament immediately after registering.

---

## Core workflows

### 1. Onboard & set up an organization
Sign up (`POST /api/auth/signup`) → a personal org, membership and free
subscription are created in one batch → session cookie issued. Upgrade later via
`/api/billing`.

### 2. Build the school & roster
Create schools (`POST /api/schools`), add athletes individually
(`POST /api/schools/:id/athletes`) or in bulk via CSV-style import
(`POST /api/schools/:id/athletes/import`, which accepts `{ rows: [...] }`).

### 3. Create a tournament
`POST /api/tournaments` with name, slug, styles, dates and venue. Tournaments
start in `draft` and are private (`is_public = 0`).

### 4. Configure divisions
`POST /api/tournaments/:id/divisions` — each division has a style, a bracket
format (`single_elimination` | `round_robin` | `pool_to_bracket`), and optional
gender / age / weight / belt constraints and a `cap`.

### 5. Open registration
Move the tournament forward with `PATCH /api/tournaments/:id/status`. Athletes or
schools register via `POST /api/registrations` — the handler enforces division
caps (over-cap entries are **waitlisted**), records a waiver acceptance, creates
registration line items (one flat entry fee per division), and creates a
`division_entries` row per division. Registrations without a Stripe key sit in
`awaiting_payment`.

### 6. Seed & generate brackets
Once entries exist, `POST /api/tournaments/divisions/:divisionId/bracket` pulls
the checked-in field (statuses `registered` / `checked_in` / `weighed_in`,
ordered by seed), runs `@bushi/brackets`, stores the JSON bracket
(`ON CONFLICT(division_id) DO UPDATE`), and flips the division to `seeded`.
Needs at least two entries.

### 7. Run the day — live scoring
Scorekeepers/referees connect to `/api/live/:matchId?role=...` (WebSocket → the
per-match `MatRoom` DO). They start the clock, add points, issue penalties, step
through periods and record the result. Display boards and spectators connect
read-only and receive the same broadcast state frames. On a result, the outcome
is persisted back to the `matches` table via the job queue.

### 8. Publish results & discovery
Public, unauthenticated endpoints power SEO pages and post-event content:
`/api/public/discover`, `/api/public/tournaments/:slug`,
`/api/public/tournaments/:slug/results` (brackets + matches),
`/api/public/schools/:slug` (profile, athletes, rankings).

### 9. Marketing & recaps _(scaffolded)_
AI promo copy (`/api/ai/tournament/:id/promo`) and the organizer assistant
(`/api/ai/assistant`) are live with graceful fallbacks. Lifecycle campaigns
(pre-event promotion, post-event content) and generated visuals (result cards,
posters, OG images) are scaffolded in `@bushi/marketing` and `@bushi/rendering` —
see [`ai-prompts.md`](./ai-prompts.md) and [`roadmap.md`](./roadmap.md).

---

## Tournament lifecycle & statuses

Statuses come from `TOURNAMENT_STATUSES`
([constants.ts](../packages/domain/src/constants.ts)):

```
 draft ──▶ published ──▶ registration_open ──▶ registration_closed ──▶ live ──▶ completed ──▶ archived
   │                                                                                            
   └─ private (is_public = 0)          published+ ──▶ public (is_public = 1)                    
```

- **draft** — private working state; not discoverable.
- **published** — publicly visible landing page, registration not yet open.
- **registration_open** — athletes/schools can register (subject to caps →
  waitlist).
- **registration_closed** — field locked; organizer seeds and generates brackets.
- **live** — matches are being scored on the mats.
- **completed** — results final; recaps and rankings update.
- **archived** — retained for history/SEO.

`PATCH /api/tournaments/:id/status` also toggles `is_public`: `draft` keeps the
tournament private; any other status makes it public.

### Related status enums
- **Divisions:** `open` → `seeded` → `live` → `complete`.
- **Division entries** (`DIVISION_ENTRY_STATUSES`): `registered`, `checked_in`,
  `weighed_in`, `no_show`, `scratched`, `withdrawn`.
- **Registrations** (`REGISTRATION_STATUSES`): `pending`, `awaiting_payment`,
  `confirmed`, `waitlisted`, `cancelled`, `refunded`.
- **Matches** (`MATCH_STATUSES`): `pending`, `ready`, `live`, `completed`,
  `no_contest`.

---

## Supported styles

From `MARTIAL_ARTS_STYLES` / `STYLE_LABELS`:

| Key | Label |
| --- | --- |
| `karate` | Karate |
| `taekwondo` | Taekwondo |
| `bjj` | Brazilian Jiu-Jitsu |
| `judo` | Judo |
| `kickboxing` | Kickboxing |
| `mma_amateur` | Amateur MMA |
| `open_mixed` | Open / Mixed Rules |

Belt/rank systems are normalized per style in `BELT_SYSTEMS` (BJJ, karate,
taekwondo, judo), stored as a label plus an ordinal so cross-style comparisons
stay meaningful.

---

## Module overview

| Module | Package(s) | Status |
| --- | --- | --- |
| Identity, orgs, sessions | `@bushi/auth`, `@bushi/db` | Working |
| Schools & athletes | `@bushi/db`, API `/schools` | Working |
| Tournaments & divisions | `@bushi/db`, API `/tournaments` | Working |
| Bracketing & seeding | `@bushi/brackets` | Working (12 tests) |
| Registration & waitlist | API `/registrations`, `@bushi/db` | Working |
| Live scoring | `MatRoom` DO, `@bushi/domain` | Working |
| Public discovery / SEO | API `/public`, `@bushi/db` | Working |
| Commerce & subscriptions | `@bushi/payments`, API `/billing` | Stub → live with Stripe keys |
| AI copy & assistant | `@bushi/ai`, API `/ai` | Working with fallback; full via Workers AI |
| Generated visuals | `@bushi/rendering` | Scaffolded |
| Search | `@bushi/search` | Keyword live; semantic pending Vectorize |
| Notifications / email | `@bushi/notifications` | Scaffolded |
| Lifecycle marketing | `@bushi/marketing` (Workflows) | Scaffolded |
| Bitoku integration | `@bushi/integrations` | Interfaces + stubs |
| Admin surface | API `/admin` | Working (platform_admin only) |
