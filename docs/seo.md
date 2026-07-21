# Bushi — SEO & discoverability

What's implemented, and the handful of steps that need your domain/DNS. Framed
against a Lovable-style SEO checklist.

## ✅ Implemented in code

| Check | What we did |
|---|---|
| **Crawler rules (robots.txt)** | Served dynamically by the Worker at `/robots.txt` (allows crawling, disallows `/app` + `/admin`, links the sitemap). Static fallback in `apps/web/public/robots.txt`. |
| **Sitemap** | `GET /sitemap.xml` on the Worker — static marketing routes + every public tournament (`/t/:slug`) and school (`/s/:slug`) from D1, with `lastmod`. |
| **Social previews are page-specific** | `useSeo()` sets per-page `og:title/description/url` + `twitter:*`; `useJsonLd()` adds structured data. `index.html` carries sensible defaults. Optional `VITE_OG_IMAGE` sets the share image site-wide (per-page override supported). |
| **Structured data** | JSON-LD: `Organization` + `WebSite` (with `SearchAction`) on the home page; `SportsEvent` on public tournament pages. |
| **Titles / descriptions right-sized** | Home title shortened; `useSeo` clamps descriptions to ~160 chars. |
| **AI-readable summary (llms.txt / markdown)** | `GET /llms.txt` on the Worker — a Markdown summary + key links for AI assistants. |
| **Accessibility** | Labeled search inputs (`aria-label`), decorative SVG marked `aria-hidden`, real `<label>`s on forms. |
| **Canonical URLs** | `useSeo` sets `<link rel="canonical">` per route. |
| **Page speed / mobile / fully-rendered** | Vite build, code-split heavy routes (mapbox lazy), responsive Tailwind, main bundle ~97KB gz. |

## 🔧 Your steps (domain / account)

1. **Route SEO paths to the Worker on your primary domain.** So `robots.txt`,
   `sitemap.xml`, `llms.txt` (and `/api`, `/media`) sit on the same origin as the
   site. Two options:
   - **Custom domain + routes:** point the domain at Pages for the SPA and add
     Worker routes for `yourdomain.com/api/*`, `/media/*`, `/robots.txt`,
     `/sitemap.xml`, `/llms.txt`.
   - **Or** submit the Worker's sitemap URL (`https://bushi.<sub>.workers.dev/sitemap.xml`)
     directly in Search Console as a sitemap for your verified property.

2. **Google Search Console** — verify the domain (DNS TXT is easiest), then submit
   the sitemap URL from step 1. This clears the "Search Console isn't set up" and
   "Sitemap needs attention" items.

3. **Social share image** — add a 1200×630 image and set the `VITE_OG_IMAGE`
   repo Variable to its absolute URL (you can host one on R2 via `/media`, e.g. a
   Higgsfield-generated arena still). This makes link unfurls branded.

## Notes / future

- The SPA is client-rendered, so `useSeo`/JSON-LD are applied after hydration.
  Google renders JS and picks these up; for non-JS crawlers and maximum ranking,
  a prerender/SSG pass on the public routes (`/`, `/features`, `/pricing`,
  `/t/:slug`, `/s/:slug`) is the next step.
- The "ESOP repurchase" style content suggestions from keyword tools are generic
  and not relevant to Bushi — ignore.
