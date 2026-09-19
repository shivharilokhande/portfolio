/**
 * useSiteMeta — patches <title>, canonical, and Open-Graph / Twitter meta
 * tags at runtime from the CMS-driven profile + AppSettings.
 *
 *   index.html carries baked defaults for the initial paint / crawlers that
 *   don't execute JS, but any buyer of the template can rebrand the entire
 *   site by editing the Profile row and the "site.title", "site.description",
 *   "site.ogImageUrl" AppSettings — no redeploy, no HTML edit.
 *
 *   Route-aware: this hook owns the HOME route (/) only. Every other route
 *   sets its own title / description / canonical / JSON-LD via usePageMeta,
 *   so a late CMS profile fetch can no longer stomp a product page's meta
 *   with the home-page values (which made every URL canonical = "/").
 *
 *   Mount once at the App root.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { profile as staticProfile } from '../lib/data';
import { useSection } from './usePortfolioContent';
import { applyPageMeta } from './usePageMeta';
import { SITE_URL } from '../lib/site';

type SiteMeta = {
  title?: string;
  description?: string;
  ogImageUrl?: string;
  canonicalUrl?: string;
};

export function useSiteMeta() {
  const profile = useSection<typeof staticProfile>('profile', staticProfile);
  const site    = useSection<SiteMeta>('siteMeta', {});
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  useEffect(() => {
    if (!isHome) return; // other routes own their own meta (usePageMeta)
    const title       = site.title       || `${profile.name} — ${profile.title}`;
    const description = site.description || profile.oneLiner;
    const canonical   = site.canonicalUrl || `${SITE_URL}/`;

    applyPageMeta({
      title,
      description,
      canonicalPath: canonical,
      type: 'profile',
      image: site.ogImageUrl || undefined,
      // Home JSON-LD (Person / WebSite / FAQ) is baked into index.html — no route node.
      jsonLd: null,
    });
    // author tag is site-wide; keep it in sync with the CMS profile.
    let author = document.head.querySelector<HTMLMetaElement>('meta[name="author"]');
    if (!author) {
      author = document.createElement('meta');
      author.setAttribute('name', 'author');
      document.head.appendChild(author);
    }
    author.setAttribute('content', profile.name);
  }, [isHome, profile.name, profile.title, profile.oneLiner, site.title, site.description, site.ogImageUrl, site.canonicalUrl]);
}
