import { useEffect } from 'react';

const SITE_NAME = 'Bushi';
const DEFAULT_OG_IMAGE = (import.meta.env.VITE_OG_IMAGE as string | undefined) ?? '';

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  const selector = `meta[${attr}="${key}"]`;
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function upsertCanonical(href: string): void {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

/** Clamp a description to a search-friendly length (~160 chars). */
function clampDescription(d: string): string {
  return d.length <= 160 ? d : `${d.slice(0, 157).trimEnd()}…`;
}

/**
 * Per-page SEO — title, meta description, Open Graph / Twitter tags (with a
 * page-specific or default social image), and a canonical URL. Client-rendered
 * (SPA); a prerender pass would extend this to non-JS crawlers.
 */
export function useSeo(title: string, description?: string, image?: string): void {
  useEffect(() => {
    const fullTitle = title.includes('Bushi') ? title : `${title} · Bushi 武士`;
    document.title = fullTitle;
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:card', 'summary_large_image');

    if (description) {
      const clamped = clampDescription(description);
      upsertMeta('name', 'description', clamped);
      upsertMeta('property', 'og:description', clamped);
      upsertMeta('name', 'twitter:description', clamped);
    }

    const og = image ?? DEFAULT_OG_IMAGE;
    if (og) {
      const abs = og.startsWith('http') ? og : `${location.origin}${og}`;
      upsertMeta('property', 'og:image', abs);
      upsertMeta('name', 'twitter:image', abs);
    }

    if (typeof location !== 'undefined') {
      upsertMeta('property', 'og:url', location.href);
      upsertCanonical(location.origin + location.pathname);
    }
  }, [title, description, image]);
}

/**
 * Inject a JSON-LD structured-data block (schema.org). Pass a plain object; it's
 * serialized into a <script type="application/ld+json"> keyed by `id` so pages
 * can replace their own block on navigation.
 */
export function useJsonLd(id: string, data: Record<string, unknown> | null): void {
  useEffect(() => {
    const elId = `jsonld-${id}`;
    const existing = document.getElementById(elId);
    if (!data) {
      existing?.remove();
      return;
    }
    const script = existing ?? document.createElement('script');
    script.id = elId;
    script.setAttribute('type', 'application/ld+json');
    script.textContent = JSON.stringify(data);
    if (!existing) document.head.appendChild(script);
    return () => {
      document.getElementById(elId)?.remove();
    };
  }, [id, data]);
}
