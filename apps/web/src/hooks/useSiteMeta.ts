/**
 * useSiteMeta — patches <title>, canonical, and Open-Graph / Twitter meta
 * tags at runtime from the CMS-driven profile + AppSettings.
 *
 *   index.html carries baked defaults for the initial paint / crawlers that
 *   don't execute JS, but any buyer of the template can rebrand the entire
 *   site by editing the Profile row and the "site.title", "site.description",
 *   "site.ogImageUrl" AppSettings — no redeploy, no HTML edit.
 *
 *   Mount once at the App root.
 */
import { useEffect } from 'react';
import { profile as staticProfile } from '../lib/data';
import { useSection } from './usePortfolioContent';

type SiteMeta = {
  title?: string;
  description?: string;
  ogImageUrl?: string;
  canonicalUrl?: string;
};

/** Set (or update) a `<meta name|property="..." content="...">` tag. */
function setMeta(kind: 'name' | 'property', key: string, value: string) {
  if (!value) return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${kind}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(kind, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function setCanonical(href: string) {
  if (!href) return;
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function useSiteMeta() {
  const profile = useSection<typeof staticProfile>('profile', staticProfile);
  const site    = useSection<SiteMeta>('siteMeta', {});

  useEffect(() => {
    const title       = site.title       || `${profile.name} — ${profile.title}`;
    const description = site.description || profile.oneLiner;
    const image       = site.ogImageUrl  || '';
    const canonical   = site.canonicalUrl || (typeof window !== 'undefined' ? window.location.origin + '/' : '');

    if (title) document.title = title;
    if (canonical) setCanonical(canonical);
    setMeta('name',     'description',       description);
    setMeta('name',     'author',            profile.name);
    setMeta('property', 'og:title',          title);
    setMeta('property', 'og:description',    description);
    setMeta('property', 'og:url',            canonical);
    if (image) setMeta('property', 'og:image', image);
    setMeta('name',     'twitter:title',       title);
    setMeta('name',     'twitter:description', description);
    if (image) setMeta('name', 'twitter:image', image);
  }, [profile.name, profile.title, profile.oneLiner, site.title, site.description, site.ogImageUrl, site.canonicalUrl]);
}
