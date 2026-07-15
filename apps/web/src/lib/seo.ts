import { useEffect } from 'react';

function upsertMeta(selector: string, attr: 'name' | 'property', key: string, content: string): void {
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

/**
 * SEO helper — sets document title, meta description, Open Graph / Twitter tags,
 * and a canonical URL per page. Client-side (SPA), so crawlers that execute JS
 * pick it up; a prerender/SSR pass would be the next step for the rest.
 */
export function useSeo(title: string, description?: string): void {
  useEffect(() => {
    const fullTitle = title.includes('Bushi') ? title : `${title} · Bushi 武士`;
    document.title = fullTitle;
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    if (description) {
      upsertMeta('meta[name="description"]', 'name', 'description', description);
      upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
      upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    }
    if (typeof location !== 'undefined') {
      upsertMeta('meta[property="og:url"]', 'property', 'og:url', location.href);
      upsertCanonical(location.origin + location.pathname);
    }
  }, [title, description]);
}
