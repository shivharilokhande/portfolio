import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Menu, X, ShoppingBag, ArrowUpRight } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { profile as staticProfile } from '../lib/data';
import { useSection } from '../hooks/usePortfolioContent';
import { assetUrl, warmApi } from '../lib/api';
import { useCart } from '../store/cartStore';
import BrandLogo from './BrandLogo';

type NavLink = { id: string; label: string; href: string; external?: boolean };

/** All in-page anchors use `/#…` so they resolve from any route (store/admin/etc.).
 *  On `/` the browser scrolls in place; from `/store/*` it navigates home first. */
const links: NavLink[] = [
  { id: 'about',        label: 'About',     href: '/#about' },
  { id: 'skills',       label: 'Skills',    href: '/#skills' },
  { id: 'timeline',     label: 'Journey',   href: '/#timeline' },
  { id: 'projects',     label: 'Projects',  href: '/#projects' },
  { id: 'store',        label: 'Store',     href: '/store' },
  { id: 'testimonials', label: 'Voices',    href: '/#testimonials' },
  { id: 'services',     label: 'Services',  href: '/#services' },
  { id: 'contact',      label: 'Hire me',   href: '/#contact' },
  { id: 'portfolio',    label: 'Portfolio', href: '/portfolio/', external: true },
];

function LinkItem({ l, onClick, mobile = false }: { l: NavLink; onClick?: () => void; mobile?: boolean }) {
  const { pathname } = useLocation();
  // Route-level "current page" for assistive tech (hash sections handled by scroll spy elsewhere).
  const routePath = l.href.split('#')[0];
  const current = routePath !== '/' && routePath !== '' && pathname.startsWith(routePath.replace(/\/$/, '')) ? 'page' as const : undefined;
  // Mobile rows are full-width, 44px-tall tap targets; desktop keeps the compact pill.
  const cls = mobile
    ? 'flex items-center min-h-[44px] px-3 py-2 rounded-lg text-base text-ink-soft hover:text-ink hover:bg-surface-low/70 transition'
    : 'px-3 py-2 rounded-lg text-ink-soft hover:text-ink hover:bg-surface-low/70 transition';
  if (l.href.startsWith('/') && !l.external) {
    // Hovering/focusing the Store link is a strong intent signal — start
    // waking the backend before the click so the catalog loads live sooner.
    const warm = l.id === 'store' ? warmApi : undefined;
    return (
      <Link to={l.href} onClick={onClick} onPointerEnter={warm} onFocus={warm} className={cls} aria-current={current}>
        {l.label}
      </Link>
    );
  }
  return <a href={l.href} onClick={onClick} className={cls} aria-current={current}>{l.label}</a>;
}

/** Whether a profile.cvUrl value should render as a live download link.
 *  Accepts uploaded (`/api/profile/cv…`) and any absolute external URL;
 *  rejects the stale seed default and empty strings. */
function isValidCvUrl(url?: string): boolean {
  if (!url) return false;
  if (url.startsWith('/api/profile/cv')) return true;
  if (/^https?:\/\//.test(url)) return true;
  return false;
}

/** Filename the browser should save the downloaded CV as. Derived from
 *  the admin's `shortName` so a buyer's CV downloads as their name too. */
function cvDownloadName(p: { shortName?: string; name?: string }): string {
  const raw = (p.shortName || p.name || 'cv').toString().trim();
  const safe = raw.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cv';
  return `${safe}-cv.pdf`;
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const cartCount = useCart((s) => s.itemCount());
  // Pull the live CMS profile so the CV pill appears the moment the admin
  // uploads a PDF (or points cvUrl at any http(s):// URL). Falls back to
  // the static seed when the CMS row hasn't loaded yet.
  const profile = useSection<typeof staticProfile>('profile', staticProfile);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`fixed top-0 inset-x-0 z-50 transition-all ${scrolled ? 'glass ambient-float' : 'bg-transparent'}`}
    >
      <a href="#content" className="sr-only focus:not-sr-only fixed top-2 left-2 z-[60] glass px-3 py-1 rounded">
        Skip to content
      </a>

      <nav className="max-w-content mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand wordmark — every string driven by CMS profile (admin →
            Profile & identity → Brand prefix / suffix / initial). No
            hardcoded personal reference so template buyers can rebrand
            from one panel. */}
        <a href="/#top" className="group flex items-center gap-2">
          <BrandLogo className="hidden sm:inline-flex" />
          <span className="sm:hidden">
            <BrandLogo hideText />
          </span>
        </a>

        {/* Nine links + cart + CV + CTA need ~1100px; below xl the burger menu carries them. */}
        <ul className="hidden xl:flex items-center gap-1 text-sm">
          {links.map((l) => (
            <li key={l.id}><LinkItem l={l} /></li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Link
            to="/store/cart"
            aria-label={`Cart, ${cartCount} items`}
            onPointerEnter={warmApi}
            onFocus={warmApi}
            className="relative w-11 h-11 grid place-items-center rounded-lg ghost-line hover:bg-surface-low/70 transition"
          >
            <ShoppingBag size={16} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold text-on-primary bg-gradient-to-br from-primary to-primary-soft grid place-items-center px-1">
                {cartCount}
              </span>
            )}
          </Link>
          {/* Render the CV pill when the admin has either uploaded a real
              PDF (cvUrl starts with /api/profile/cv) or set it to any
              absolute URL (Google Drive, personal domain, etc). The old
              default seed `/Shivhari-Lokhande-CV.pdf` and empty strings
              are hidden so we never render a 404 link.

              Note the explicit `download="{shortName}-cv.pdf"` attribute:
              without it the browser saves the file as just `cv` (URL
              basename), losing the .pdf extension. The download attribute
              only fires on same-origin uploads; for external http(s):// URLs
              it's ignored and the file opens in a new tab. */}
          {isValidCvUrl(profile.cvUrl) && (
            <a
              href={assetUrl(profile.cvUrl)}
              download={cvDownloadName(profile)}
              target={profile.cvUrl.startsWith('http') ? '_blank' : undefined}
              rel={profile.cvUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="hidden sm:inline-flex items-center gap-1 min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium ghost-line hover:bg-surface-low/70 transition"
            >
              CV
            </a>
          )}
          {/* Absolute-path anchor so this CTA works from every route
              (/store/*, /admin/*), not just the home page. */}
          <a
            href="/#contact"
            className="hidden sm:inline-flex btn-primary text-sm"
          >
            Let&apos;s talk
            <ArrowUpRight size={14} />
          </a>
          <button
            className="xl:hidden w-11 h-11 grid place-items-center rounded-lg ghost-line"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="xl:hidden glass-strong ambient-float max-h-[calc(100dvh-4rem)] overflow-y-auto">
          <ul className="max-w-content mx-auto px-4 sm:px-6 py-3 flex flex-col gap-0.5 text-sm">
            {links.map((l) => (
              <li key={l.id}><LinkItem l={l} mobile onClick={() => setOpen(false)} /></li>
            ))}
            {/* CTA + CV rows for phones, where the header hides them */}
            <li className="sm:hidden mt-2 flex flex-wrap gap-2 px-1 pb-2">
              <a href="/#contact" onClick={() => setOpen(false)} className="btn-primary text-sm min-h-[44px]">
                Let&apos;s talk <ArrowUpRight size={14} />
              </a>
              {isValidCvUrl(profile.cvUrl) && (
                <a
                  href={assetUrl(profile.cvUrl)}
                  download={cvDownloadName(profile)}
                  target={profile.cvUrl.startsWith('http') ? '_blank' : undefined}
                  rel={profile.cvUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center min-h-[44px] px-4 rounded-lg text-sm font-medium ghost-line hover:bg-surface-low/70 transition"
                >
                  Download CV
                </a>
              )}
            </li>
          </ul>
        </div>
      )}
    </motion.header>
  );
}
