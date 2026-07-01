# Deployment

Deploying Bushi has two artifacts: the **Worker** (`@bushi/api` — the Hono app,
the `MatRoom` Durable Object, and the queue consumer, shipped with
`wrangler deploy`) and the **web SPA** (`@bushi/web`, shipped to Cloudflare
Pages). This guide walks the full path: provision resources → paste ids → set
secrets → migrate/seed remotely → deploy.

> Prerequisite: `wrangler login` (or a `CLOUDFLARE_API_TOKEN` with Workers, D1,
> KV, R2, Queues, Vectorize and Workers AI permissions).

---

## 1. Provision Cloudflare resources

Run each `create` and keep the returned ids/names.

```bash
# D1 — relational source of record
wrangler d1 create bushi-db
#   → copy database_id

# KV — two namespaces
wrangler kv namespace create CACHE          # → copy id
wrangler kv namespace create FEATURE_FLAGS  # → copy id

# R2 — assets + generated media
wrangler r2 bucket create bushi-assets
wrangler r2 bucket create bushi-generated

# Queues — background jobs
wrangler queues create bushi-jobs

# Vectorize — 768-dim cosine (matches @cf/baai/bge-base-en-v1.5)
wrangler vectorize create bushi-search --dimensions=768 --metric=cosine
```

**No pre-creation needed** for the Durable Object (`MAT_ROOM` / class `MatRoom`),
Workers AI (`AI`) or Browser Rendering (`BROWSER`) — those are provisioned by the
deploy that bundles them.

---

## 2. Paste ids into `wrangler.toml`

Edit [`apps/api/wrangler.toml`](../apps/api/wrangler.toml) and replace the
placeholders:

```toml
[[d1_databases]]
binding = "DB"
database_name = "bushi-db"
database_id = "REPLACE_WITH_D1_DATABASE_ID"   # ← paste from step 1

[[kv_namespaces]]
binding = "CACHE"
id = "REPLACE_WITH_KV_NAMESPACE_ID"           # ← CACHE id

[[kv_namespaces]]
binding = "FEATURE_FLAGS"
id = "REPLACE_WITH_KV_NAMESPACE_ID"           # ← FEATURE_FLAGS id
```

The R2 buckets, Queue producer/consumer, `[ai]`, `[[vectorize]]`, `[browser]`
and Durable Object blocks reference resources by **name**, so they need no id
edits. Update the `[vars]` for production while you're here:

```toml
[vars]
ENVIRONMENT = "production"
AI_GATEWAY_ID = ""                 # optional AI Gateway id
APP_BASE_URL = "https://your-domain.example"   # used for checkout redirects, etc.
```

---

## 3. Set secrets

Never commit real secret values. Set them on the deployed Worker:

```bash
wrangler secret put SESSION_SECRET          # any long random string
wrangler secret put STRIPE_SECRET_KEY       # sk_live_... (enables live checkout)
wrangler secret put STRIPE_WEBHOOK_SECRET   # whsec_...   (enables webhook handling)
wrangler secret put RESEND_API_KEY          # enables outbound email
```

All four are optional at the type level (`Env` marks them possibly-undefined) and
the app degrades gracefully if one is absent — but production should set at least
`SESSION_SECRET`.

---

## 4. Migrate & seed the remote database

```bash
# Apply migrations 0001–0006 to the remote D1
pnpm --filter @bushi/api db:migrate:remote

# (Optional) load the demo seed — usually only for staging/demo, not real prod
node packages/db/seed/generate-seed.mjs        # regenerate if needed
pnpm --filter @bushi/api db:seed:remote
```

---

## 5. Deploy the Worker

```bash
pnpm --filter @bushi/api deploy    # wrangler deploy
```

This ships the Hono app, registers the `MatRoom` Durable Object (migration tag
`v1`, `new_sqlite_classes = ["MatRoom"]`), binds the queue consumer, and enables Workers
AI + Browser Rendering. Smoke-test:

```bash
curl https://bushi-api.<your-subdomain>.workers.dev/api/health
```

---

## 6. Deploy the web app to Cloudflare Pages

> `@bushi/web` is a React + Vite + Tailwind SPA (built by another agent). Once it
> exists, deploy its build output to Pages.

Typical flow:

1. Build: `pnpm --filter @bushi/web build` (outputs `apps/web/dist`).
2. Create/point a Pages project at the repo, or push the build with
   `wrangler pages deploy apps/web/dist --project-name bushi-web`.
3. Configure the SPA's API base URL to your deployed Worker origin, and set
   `APP_BASE_URL` on the Worker to the Pages domain so billing redirects and
   share links resolve correctly.

Because the API reflects the request origin for CORS with credentials, the Pages
domain can call the Worker with the session cookie once both are on HTTPS.

---

## 7. Configure the Stripe webhook

To go live on billing:

1. In the Stripe Dashboard, add a webhook endpoint pointing at
   `https://<your-worker-origin>/api/billing/webhook`.
2. Subscribe to `customer.subscription.*` events (the handler upserts
   subscription status from those).
3. Copy the signing secret (`whsec_...`) and set it:
   `wrangler secret put STRIPE_WEBHOOK_SECRET`.

Without `STRIPE_WEBHOOK_SECRET` the webhook route acknowledges in stub mode
(`{ received: true, mode: 'stub' }`). Full signature verification (Stripe's
`t=...,v1=...` HMAC-SHA256) lives in `@bushi/payments` for the complete
implementation.

---

## 8. Enable Cloudflare Workflows (marketing)

The four lifecycle workflows live in `@bushi/marketing`
(`PreEventPromotionWorkflow`, `PostEventContentWorkflow`,
`CompetitorOnboardingWorkflow`, `SchoolClaimWorkflow`). Their bindings are
**commented out** in `wrangler.toml` until the workflow classes are bundled into
the Worker. To enable:

1. Export the workflow classes from the Worker entry (as `MatRoom` is exported).
2. Uncomment and complete the `[[workflows]]` blocks in `wrangler.toml`, e.g.:

   ```toml
   [[workflows]]
   name = "pre-event-promotion"
   binding = "PRE_EVENT_PROMOTION"
   class_name = "PreEventPromotionWorkflow"
   ```

3. Inject the AI + notification services (`WorkflowServices`, backed by
   `@bushi/ai` and `@bushi/notifications`) and redeploy.

---

## Post-deploy checklist

- [ ] `GET /api/health` returns `environment: "production"`.
- [ ] Signup/login sets a `Secure` `bushi_session` cookie.
- [ ] `/api/public/discover` returns seeded/real tournaments.
- [ ] A `MatRoom` accepts a WebSocket at `/api/live/:matchId` and broadcasts state.
- [ ] `bushi-jobs` consumer drains a `persist_match_result` after a live result.
- [ ] (If enabled) Stripe webhook shows `2xx` in the dashboard; `/api/ai/*`
      returns `status: "ok"` rather than `fallback`.
