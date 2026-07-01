# Cloudflare bindings

Every stateful dependency Bushi has is a Cloudflare binding declared in
[`apps/api/wrangler.toml`](../apps/api/wrangler.toml) and typed in
[`apps/api/src/env.ts`](../apps/api/src/env.ts). This is the single reference for
what each binding is, how it's created, and which route/package consumes it.

Optional bindings (`AI`, `SEARCH_INDEX`, `BROWSER`) and the secrets are typed as
possibly-undefined so handlers can degrade gracefully when a resource isn't
provisioned.

---

## Binding table

| Binding | Type | Resource | Purpose | Create command |
| --- | --- | --- | --- | --- |
| `DB` | D1 database | `bushi-db` | Relational source of record | `wrangler d1 create bushi-db` |
| `MAT_ROOM` | Durable Object | class `MatRoom` | One live-scoring room per match | (bundled by deploy) |
| `CACHE` | KV namespace | — | Hot lookups / ephemeral caches | `wrangler kv namespace create CACHE` |
| `FEATURE_FLAGS` | KV namespace | — | Feature flags (admin-toggleable) | `wrangler kv namespace create FEATURE_FLAGS` |
| `ASSETS` | R2 bucket | `bushi-assets` | Uploads: logos, waivers, docs | `wrangler r2 bucket create bushi-assets` |
| `GENERATED` | R2 bucket | `bushi-generated` | Generated media: cards, posters, PDFs | `wrangler r2 bucket create bushi-generated` |
| `JOBS` | Queue (producer + consumer) | `bushi-jobs` | Async fan-out / background jobs | `wrangler queues create bushi-jobs` |
| `AI` | Workers AI | — | Text (Llama) + image (FLUX) inference, embeddings | (bundled by deploy) |
| `SEARCH_INDEX` | Vectorize index | `bushi-search` | Semantic search embeddings | `wrangler vectorize create bushi-search --dimensions=768 --metric=cosine` |
| `BROWSER` | Browser Rendering | — | HTML → image/PDF for share cards & docs | (bundled by deploy) |

### Vars

| Var | Default (dev) | Purpose |
| --- | --- | --- |
| `ENVIRONMENT` | `development` | Reported by `/api/health`; environment gating |
| `AI_GATEWAY_ID` | `""` | Optional AI Gateway routing id |
| `APP_BASE_URL` | `http://localhost:5173` | Redirect/base for checkout, share links |

### Secrets (via `wrangler secret put <NAME>`)

| Secret | Enables |
| --- | --- |
| `SESSION_SECRET` | Session security |
| `STRIPE_SECRET_KEY` | Live Stripe Checkout (stub without it) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification (stub without it) |
| `RESEND_API_KEY` | Outbound email |

---

## Per-binding detail

### `DB` — D1
```toml
[[d1_databases]]
binding = "DB"
database_name = "bushi-db"
database_id = "REPLACE_WITH_D1_DATABASE_ID"
migrations_dir = "../../packages/db/migrations"
```
Accessed through the `Db` helper in `@bushi/db` (`all`/`first`/`run`/`batch`).
**Consumed by:** essentially every route (`auth`, `tournaments`, `schools`,
`registrations`, `public`, `billing`, `ai`, `admin`) and the queue consumer.
Migrations live in `packages/db/migrations` (0001–0006).

### `MAT_ROOM` — Durable Object
```toml
[[durable_objects.bindings]]
name = "MAT_ROOM"
class_name = "MatRoom"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["MatRoom"]
```
One instance per match (`idFromName(matchId)`). Owns live match state, accepts
validated scoring events, broadcasts state frames, and enqueues persistence.
**Consumed by:** `/api/live/:matchId` (WS upgrade), `/init`, `/state`
([`routes/live.ts`](../apps/api/src/routes/live.ts) →
[`do/MatRoom.ts`](../apps/api/src/do/MatRoom.ts)).

### `CACHE` / `FEATURE_FLAGS` — KV
```toml
[[kv_namespaces]]
binding = "CACHE"
id = "REPLACE_WITH_KV_NAMESPACE_ID"

[[kv_namespaces]]
binding = "FEATURE_FLAGS"
id = "REPLACE_WITH_KV_NAMESPACE_ID"
```
`CACHE` is for hot lookups and ephemeral caches. `FEATURE_FLAGS` backs the admin
feature-flag surface. **Consumed by:** `/api/admin/feature-flags` (list/get/put
on `FEATURE_FLAGS`); `CACHE` is reserved for read-through caching of public pages.

### `ASSETS` / `GENERATED` — R2
```toml
[[r2_buckets]]
binding = "ASSETS"
bucket_name = "bushi-assets"

[[r2_buckets]]
binding = "GENERATED"
bucket_name = "bushi-generated"
```
`ASSETS` holds user uploads (school/sponsor logos, athlete documents/waivers —
referenced by `r2_key` columns in the schema). `GENERATED` holds machine-produced
media (result cards, posters, OG images, certificates, PDFs).
**Consumed by:** `@bushi/rendering` (`storeInR2`) for `GENERATED`; upload flows
and `generate_asset` jobs for both. `generated_assets.r2_key` records the object.

### `JOBS` — Queue
```toml
[[queues.producers]]
binding = "JOBS"
queue = "bushi-jobs"

[[queues.consumers]]
queue = "bushi-jobs"
max_batch_size = 10
max_batch_timeout = 30
```
Producer + consumer of `JobMessage` (`persist_match_result`, `index_entity`,
`send_email`, `generate_asset`). **Produced by:** `MatRoom` (match results).
**Consumed by:** the Worker's `queue` handler in
[`index.ts`](../apps/api/src/index.ts).

### `AI` — Workers AI
```toml
[ai]
binding = "AI"
```
Text generation (`@cf/meta/llama-3.1-8b-instruct`), embeddings
(`@cf/baai/bge-base-en-v1.5`), and FLUX image generation
(`@cf/black-forest-labs/flux-1-schnell`). Optional AI Gateway via `AI_GATEWAY_ID`.
**Consumed by:** `/api/ai/*` (promo copy + assistant, with deterministic fallback
when unbound) and `@bushi/ai`. See [`ai-prompts.md`](./ai-prompts.md).

### `SEARCH_INDEX` — Vectorize
```toml
[[vectorize]]
binding = "SEARCH_INDEX"
index_name = "bushi-search"
```
768-dimension cosine index, sized to match `bge-base-en-v1.5`. **Consumed by:**
`@bushi/search` (`semanticSuggest`) and the `index_entity` job (which currently
records a `search_embeddings_refs` row; the Vectorize upsert is the next step).

### `BROWSER` — Browser Rendering
```toml
[browser]
binding = "BROWSER"
```
Renders HTML templates to images/PDFs for share cards, posters, OG images and
certificates. **Consumed by:** `@bushi/rendering` (`renderToImage`,
`renderToPdf`).

### Email
No dedicated `wrangler.toml` binding block ships today — `@bushi/notifications`
uses an injected fetch-capable send binding (MailChannels-style) or Resend via
`RESEND_API_KEY`. Wire a `SEND_EMAIL` service binding / Worker route when
activating outbound email.

### Workflows (commented out)
`@bushi/marketing` defines four workflow classes. Their `[[workflows]]` bindings
are commented in `wrangler.toml` until the classes are exported from the Worker
and bundled — see [`deployment.md`](./deployment.md#8-enable-cloudflare-workflows-marketing).

---

## Env interface (source of truth)

From [`apps/api/src/env.ts`](../apps/api/src/env.ts):

```ts
interface Env {
  DB: D1Database;
  MAT_ROOM: DurableObjectNamespace;
  CACHE: KVNamespace;
  FEATURE_FLAGS: KVNamespace;
  ASSETS: R2Bucket;
  GENERATED: R2Bucket;
  JOBS: Queue<JobMessage>;
  AI?: Ai;                    // optional
  SEARCH_INDEX?: VectorizeIndex; // optional
  BROWSER?: Fetcher;          // optional
  ENVIRONMENT: string;
  AI_GATEWAY_ID: string;
  APP_BASE_URL: string;
  SESSION_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  RESEND_API_KEY?: string;
}
```
