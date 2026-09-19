/**
 * Hero — Luminous Engine editorial launch.
 *
 *  Light surface, asymmetric layout (60/40), Space Grotesk display,
 *  tonal "Live · ready to brief" indicator, primary energy gradient on CTA.
 *  No 1px borders anywhere — separation is purely tonal.
 */
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Download, Sparkles, ArrowRight, ArrowDown } from 'lucide-react';
import { profile as staticProfile } from '../lib/data';
import { useSection } from '../hooks/usePortfolioContent';
import { assetUrl } from '../lib/api';
import { copyDefaults, mergeCopy } from '../lib/copyDefaults';

const easeOut = [0.22, 1, 0.36, 1] as const;
const FALLBACK_HEADLINE =
  'Forward Deployed Engineer, Scrum Master & Workiva delivery lead.'.split(' ');
const FALLBACK_SUB =
  'Six years across IIT Bombay, Accenture, Deloitte, EY and CES. Sprint commitment 78→94%, 50+ Workiva API integrations, 17 engineers led across two time zones.';

type HeroDoc = {
  headline?:     string[];
  sub?:          string;
  badge?:        string;
  primaryCta?:   { label?: string; href?: string };
  secondaryCta?: { label?: string; href?: string };
};

const FALLBACK_HERO: Required<Omit<HeroDoc, 'primaryCta' | 'secondaryCta'>> & {
  primaryCta:   { label: string; href: string };
  secondaryCta: { label: string; href: string };
} = {
  headline:     FALLBACK_HEADLINE,
  sub:          FALLBACK_SUB,
  badge:        'Available for forward-deployed & Workiva engagements',
  primaryCta:   { label: 'Book a free 30-min discovery call', href: '/#contact' },
  secondaryCta: { label: '',                                   href: '' },
};

/** Whether profile.cvUrl should render as a working download link. */
function isValidCvUrl(url?: string): boolean {
  if (!url) return false;
  if (url.startsWith('/api/profile/cv')) return true;
  if (/^https?:\/\//.test(url)) return true;
  return false;
}

/** Filename the browser saves the CV as. Uses profile.shortName so buyers'
 *  visitors get a "{FirstName}-cv.pdf" file rather than a bare `cv`. */
function cvDownloadName(p: { shortName?: string; name?: string }): string {
  const raw = (p.shortName || p.name || 'cv').toString().trim();
  const safe = raw.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cv';
  return `${safe}-cv.pdf`;
}

export default function Hero() {
  const profile = useSection<typeof staticProfile>('profile', staticProfile);
  const hero    = useSection<HeroDoc>('hero', FALLBACK_HERO);
  const headlineWords = hero.headline?.length ? hero.headline : FALLBACK_HEADLINE;
  const subText       = hero.sub   ?? FALLBACK_SUB;
  const badgeText     = hero.badge ?? FALLBACK_HERO.badge;
  // CTAs: CMS hero doc wins; otherwise the primary CTA books via
  // profile.calendarUrl when set, else scrolls to the contact form.
  const primaryLabel = hero.primaryCta?.label || FALLBACK_HERO.primaryCta.label;
  const primaryHref  = hero.primaryCta?.href  || profile.calendarUrl || FALLBACK_HERO.primaryCta.href;
  const primaryExternal = /^https?:\/\//.test(primaryHref);
  // Optional: rendered only when the CMS gives it both a label and a link.
  const secondaryLabel = (hero.secondaryCta?.label ?? '').trim();
  const secondaryHref  = (hero.secondaryCta?.href  ?? '').trim();
  const showSecondary  = Boolean(secondaryLabel && secondaryHref);
  // Long, offer-style headlines drop one display step so they still fit
  // on three lines at desktop widths.
  const headlineSize = headlineWords.length > 7 ? 'text-display-md' : 'text-display-lg';
  // Right-side "SHIPPING · NOW" card copy — every string, the stats, and
  // the chip row all come from the CMS 'copy' section now. Edit under
  // /admin/portfolio → Site copy → Hero card.
  const heroCard = mergeCopy(useSection('copy', copyDefaults)).heroCard;

  // Scroll-driven parallax — left column slows, right card accelerates,
  // and the whole section fades a touch as it leaves.
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const leftY    = useTransform(scrollYProgress, [0, 1], [0,  -80]);
  const rightY   = useTransform(scrollYProgress, [0, 1], [0, -160]);
  const heroFade = useTransform(scrollYProgress, [0, 0.7, 1], [1, 0.7, 0]);

  return (
    <section ref={sectionRef} id="top" className="relative min-h-[100svh] flex items-center pt-24 pb-16 sm:pb-20 overflow-x-hidden">
      {/* Soft primary aurora — sets the energy of the room without dominating */}
      <div className="aurora bg-[radial-gradient(circle_at_18%_30%,rgba(0,209,102,0.18),transparent_60%),radial-gradient(circle_at_82%_70%,rgba(10,92,207,0.10),transparent_55%)]" />

      <motion.div style={{ opacity: heroFade }} className="relative z-10 max-w-content mx-auto px-4 sm:px-6 w-full">
        {/* Asymmetric grid — 1.4fr : 1fr breaks the standard 12-col grid */}
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-12 items-start">

          <motion.div style={{ y: leftY }}>
            <motion.span
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: easeOut }}
              className="chip-resource chip-resource-lg max-w-full whitespace-normal text-left"
            >
              <span className="dot-live" />
              {badgeText}
            </motion.span>

            <h1 className={`mt-6 sm:mt-7 font-display ${headlineSize} max-w-5xl text-ink`}>
              {headlineWords.map((w, i) => (
                <span key={i} className="inline-block overflow-hidden align-bottom mr-2 sm:mr-3 pb-1">
                  <motion.span
                    initial={{ y: '110%', opacity: 0 }}
                    animate={{ y: '0%', opacity: 1 }}
                    transition={{ duration: 0.75, ease: easeOut, delay: 0.25 + i * 0.07 }}
                    className={`inline-block ${
                      i === 0 || i === headlineWords.length - 1
                        ? 'text-gradient'
                        : 'text-ink'
                    }`}
                  >
                    {w}
                  </motion.span>
                </span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: easeOut, delay: 0.85 }}
              className="mt-7 max-w-2xl text-base sm:text-lg text-ink-soft leading-relaxed"
            >
              {/* Offer sub-line — `hero.sub` from the CMS hero doc when set,
                  otherwise the proof-point default above. */}
              {subText}
            </motion.p>

            <motion.div
              initial="hidden"
              animate="show"
              transition={{ delay: 1.05, staggerChildren: 0.08 }}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
              className="mt-8 sm:mt-10 flex flex-wrap gap-3 [&>a]:min-h-[44px]"
            >
              <motion.a
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.5, ease: easeOut }}
                href={primaryHref}
                target={primaryExternal ? '_blank' : undefined}
                rel={primaryExternal ? 'noopener noreferrer' : undefined}
                className="btn-primary"
              >
                {primaryLabel}
                <ArrowRight size={16} />
              </motion.a>
              {/* Optional secondary CTA (plain anchor so it can point outside the SPA router). */}
              {showSecondary && (
                <motion.a
                  variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.5, ease: easeOut }}
                  href={secondaryHref}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg surface-low ghost-line text-ink font-semibold text-sm hover:bg-surface-container transition"
                >
                  {secondaryLabel} <ArrowRight size={16} aria-hidden />
                </motion.a>
              )}
              {/* Render when the admin has either uploaded a PDF or set
                  cvUrl to any absolute URL. Empty / the stale seed default
                  are hidden to prevent a broken link. `download="…-cv.pdf"`
                  is explicit so the browser saves the file with the .pdf
                  extension instead of the URL basename (`cv`). */}
              {isValidCvUrl(profile.cvUrl) && (
                <motion.a
                  variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.5, ease: easeOut }}
                  href={assetUrl(profile.cvUrl)}
                  download={cvDownloadName(profile)}
                  target={profile.cvUrl.startsWith('http') ? '_blank' : undefined}
                  rel={profile.cvUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg surface-low ghost-line text-ink font-semibold text-sm hover:bg-surface-container transition"
                >
                  <Download size={16} /> Download CV
                </motion.a>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.4 }}
              className="mt-10 sm:mt-14 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted font-mono"
            >
              <span className="inline-flex items-center gap-2">
                <Sparkles size={12} className="text-primary" />
                6 yrs · IIT · Accenture · Deloitte · EY · CES
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ArrowDown size={12} className="animate-bounce" /> scroll to explore
              </span>
            </motion.div>
          </motion.div>

          {/* Right column — floating data card. Tier-3 white on tier-1 page surface.
              Moves at a different rate than the left column for parallax depth. */}
          <motion.aside
            style={{ y: rightY }}
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: easeOut, delay: 0.55 }}
            className="hidden lg:block"
          >
            <div className="tier-3 ambient-float-lg p-7 relative overflow-hidden">
              {/* live badge — text driven by copy.heroCard.liveBadge */}
              <div className="absolute top-5 right-5 chip-status-active">
                <span className="dot-live" /> {heroCard.liveBadge}
              </div>
              <p className="text-label-md text-primary">{heroCard.eyebrow}</p>
              <h3 className="font-display text-2xl mt-3 leading-tight tracking-tight">
                {heroCard.title}
              </h3>
              <p className="mt-2 text-sm text-ink-soft leading-relaxed">
                {heroCard.body}
              </p>

              {/* Stats — array-driven so admins can add/remove tiles */}
              <div className="mt-8 grid grid-cols-3 gap-3 xl:gap-4">
                {heroCard.stats.slice(0, 3).map(({ n, l }, i) => (
                  <div key={`${l}-${i}`} className="tier-1 p-3 text-left">
                    <p className="font-num font-semibold text-xl xl:text-2xl text-ink leading-none break-anywhere">{n}</p>
                    <p className="text-[10px] text-muted tracking-[0.14em] uppercase mt-2">{l}</p>
                  </div>
                ))}
              </div>

              {/* Chips — CMS-driven list of tech / roles / anything */}
              <div className="mt-6 flex flex-wrap gap-1.5">
                {heroCard.chips.map((s, i) => (
                  <span key={`${s}-${i}`} className="chip-resource">{s}</span>
                ))}
              </div>
            </div>
          </motion.aside>
        </div>
      </motion.div>
    </section>
  );
}
