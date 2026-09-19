/**
 * Canonical site origin — the single source of truth for every absolute URL
 * we emit in <link rel="canonical">, og:url and JSON-LD.
 *
 *   Always prefer the constant so a preview deploy (*.pages.dev) or a local
 *   dev server never leaks its own origin into canonicals. The
 *   window.location.origin fallback only fires if the constant is blanked out.
 */
export const SITE_URL = 'https://shivhari.tech';

export const SITE_NAME = 'shivhari.tech';
export const SITE_OWNER = 'Shivhari Lokhande';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og.jpg`;

/** Resolved origin without trailing slash. */
export function siteOrigin(): string {
  const base = SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  return base.replace(/\/$/, '');
}

/** Absolute URL for a site path (`/store/foo` → `https://shivhari.tech/store/foo`). */
export function absUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${siteOrigin()}${p}`;
}
