/**
 * usePageMeta — per-route <head> management.
 *
 *   Every routed page calls this once with its own title / description /
 *   canonical path (and optionally JSON-LD). It patches <title>, description,
 *   robots, <link rel="canonical">, Open-Graph + Twitter tags, and swaps a
 *   single `<script type="application/ld+json" data-route-ld>` so structured
 *   data never duplicates across client-side navigations.
 *
 *   The home route (/) is owned by useSiteMeta (CMS-driven); every other route
 *   owns its own meta via this hook.
 */
import { useEffect } from 'react';
import { DEFAULT_OG_IMAGE, absUrl } from '../lib/site';

export type PageMeta = {
  title: string;
  description?: string;
  /** Site-relative path (e.g. `/store/foo`). Absolute URLs are accepted too. */
  canonicalPath: string;
  type?: 'website' | 'product' | 'article' | 'profile';
  image?: string;
  noindex?: boolean;
  /** One or more schema.org nodes. Rendered as a single @graph. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[] | null;
};

const INDEX_ROBOTS = 'index,follow,max-image-preview:large';
const NOINDEX_ROBOTS = 'noindex,nofollow';
const LD_ATTR = 'data-route-ld';

function setMeta(kind: 'name' | 'property', key: string, value: string | undefined) {
  if (typeof document === 'undefined') return;
  const sel = `meta[${kind}="${key}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(sel);
  if (value === undefined || value === '') { el?.remove(); return; }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(kind, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function removeRouteJsonLd() {
  if (typeof document === 'undefined') return;
  document.head.querySelectorAll(`script[${LD_ATTR}]`).forEach((s) => s.remove());
}

function setRouteJsonLd(ld: PageMeta['jsonLd']) {
  removeRouteJsonLd();
  if (!ld) return;
  const nodes = Array.isArray(ld) ? ld : [ld];
  if (nodes.length === 0) return;
  const payload = nodes.length === 1
    ? { '@context': 'https://schema.org', ...nodes[0] }
    : { '@context': 'https://schema.org', '@graph': nodes };
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute(LD_ATTR, '');
  // `<` escaped so CMS-sourced text can never close the script tag.
  script.text = JSON.stringify(payload).replace(/</g, '\\u003c');
  document.head.appendChild(script);
}

/** Imperative writer shared by usePageMeta (routes) and useSiteMeta (home). */
export function applyPageMeta(meta: PageMeta) {
  if (typeof document === 'undefined') return;
  const canonical = absUrl(meta.canonicalPath);
  const image = meta.image ? absUrl(meta.image) : DEFAULT_OG_IMAGE;
  const description = meta.description ?? '';

  document.title = meta.title;
  setCanonical(canonical);
  setMeta('name', 'description', description || undefined);
  setMeta('name', 'robots', meta.noindex ? NOINDEX_ROBOTS : INDEX_ROBOTS);

  setMeta('property', 'og:type', meta.type ?? 'website');
  setMeta('property', 'og:title', meta.title);
  setMeta('property', 'og:description', description || undefined);
  setMeta('property', 'og:url', canonical);
  setMeta('property', 'og:image', image);

  setMeta('name', 'twitter:title', meta.title);
  setMeta('name', 'twitter:description', description || undefined);
  setMeta('name', 'twitter:image', image);

  setRouteJsonLd(meta.jsonLd ?? null);
}

/** Trim to `max` chars on a word boundary for meta descriptions. */
export function truncate(text: string | null | undefined, max = 155): string {
  const s = (text ?? '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).trimEnd()}…`;
}

/** Schema.org BreadcrumbList from ordered (name, path) pairs. */
export function breadcrumbLd(items: { name: string; path: string }[]): Record<string, unknown> {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absUrl(it.path),
    })),
  };
}

export function usePageMeta(meta: PageMeta) {
  // Serialize so object-literal call sites don't re-run the effect every render.
  const key = JSON.stringify(meta);
  useEffect(() => {
    applyPageMeta(JSON.parse(key) as PageMeta);
    return () => { removeRouteJsonLd(); };
  }, [key]);
}
