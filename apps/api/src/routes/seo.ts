import { Hono } from 'hono';
import { Db } from '@bushi/db';
import type { AppBindings } from '../types.js';

/**
 * Crawler-facing endpoints: robots.txt, a dynamic sitemap.xml (static routes +
 * public tournaments/schools), and llms.txt (an AI-readable site summary).
 * Served at the root. In production, route these paths (and /api, /media) to the
 * Worker on your primary domain so they sit alongside the SPA — see docs/seo.md.
 */
export const seoRoutes = new Hono<AppBindings>();

function siteBase(c: { env: { APP_BASE_URL: string }; req: { url: string } }): string {
  return (c.env.APP_BASE_URL || new URL(c.req.url).origin).replace(/\/$/, '');
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

seoRoutes.get('/robots.txt', (c) => {
  const base = siteBase(c);
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /app',
    'Disallow: /admin',
    'Disallow: /api',
    '',
    `Sitemap: ${base}/sitemap.xml`,
    '',
  ].join('\n');
  return c.text(body, 200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' });
});

seoRoutes.get('/sitemap.xml', async (c) => {
  const base = siteBase(c);
  const db = new Db(c.env.DB);
  const [tournaments, schools] = await Promise.all([
    db.all<{ slug: string; updated_at: number }>(
      `SELECT slug, updated_at FROM tournaments WHERE is_public = 1 AND deleted_at IS NULL AND slug IS NOT NULL ORDER BY updated_at DESC LIMIT 5000`,
    ),
    db.all<{ slug: string; updated_at: number }>(
      `SELECT slug, updated_at FROM schools WHERE is_public = 1 AND deleted_at IS NULL AND slug IS NOT NULL ORDER BY updated_at DESC LIMIT 5000`,
    ),
  ]);

  const staticRoutes = [
    { path: '/', priority: '1.0', freq: 'daily' },
    { path: '/features', priority: '0.7', freq: 'monthly' },
    { path: '/pricing', priority: '0.7', freq: 'monthly' },
    { path: '/compare', priority: '0.6', freq: 'monthly' },
    { path: '/discover', priority: '0.8', freq: 'daily' },
  ];

  const urls: string[] = [];
  for (const r of staticRoutes) {
    urls.push(`<url><loc>${xmlEscape(base + r.path)}</loc><changefreq>${r.freq}</changefreq><priority>${r.priority}</priority></url>`);
  }
  for (const t of tournaments) {
    const lastmod = new Date(t.updated_at).toISOString().slice(0, 10);
    urls.push(`<url><loc>${xmlEscape(`${base}/t/${t.slug}`)}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`);
  }
  for (const s of schools) {
    const lastmod = new Date(s.updated_at).toISOString().slice(0, 10);
    urls.push(`<url><loc>${xmlEscape(`${base}/s/${s.slug}`)}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
  return c.body(xml, 200, { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' });
});

seoRoutes.get('/llms.txt', (c) => {
  const base = siteBase(c);
  const body = `# Bushi

> Bushi (武士) is the operating system for martial arts tournaments — run events
> across every style (karate, BJJ, taekwondo, judo, kickboxing) with live
> scoring, online registration, bracket automation, school profiles, and a free
> spectator experience. Built Cloudflare-native.

## Key pages
- [Home](${base}/): product overview
- [Features](${base}/features): live scoring, brackets, registration, marketing
- [Pricing](${base}/pricing): plans and pricing
- [Compare](${base}/compare): how Bushi compares to alternatives
- [Discover](${base}/discover): find upcoming martial arts tournaments

## For organizers
Create a tournament, define divisions by style/age/weight/belt, seed brackets,
open registration, and run live scoring across multiple mats in real time.

## For competitors & spectators
Follow live brackets and results for free — no account required.
`;
  return c.text(body, 200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' });
});
