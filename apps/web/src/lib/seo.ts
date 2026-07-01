import { useEffect } from 'react';

/** Tiny SEO helper — sets document title + meta description per page. */
export function useSeo(title: string, description?: string): void {
  useEffect(() => {
    document.title = title.includes('Bushi') ? title : `${title} · Bushi 武士`;
    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', 'description');
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', description);
    }
  }, [title, description]);
}
