/**
 * Voices — Luminous Engine marquee.
 *
 *   Light tonal cards, primary product chips, no 1px borders.
 *   Marquee pauses on hover for accessibility.
 */
import { Link } from 'react-router-dom';
import { Quote, Star, ShoppingBag, ArrowRight } from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import { testimonials as staticTestimonials } from '../lib/data';
import { useSection } from '../hooks/usePortfolioContent';
import { copyDefaults, mergeCopy } from '../lib/copyDefaults';

export default function Testimonials() {
  const testimonials = useSection<typeof staticTestimonials>('testimonials', staticTestimonials);
  const items = [...testimonials, ...testimonials];
  const header = mergeCopy(useSection('copy', copyDefaults)).sectionHeaders.testimonials;

  return (
    <section id="testimonials" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="max-w-content mx-auto px-4 sm:px-6">
        <SectionHeader
          eyebrow={header.eyebrow}
          title={header.title}
          description={header.description}
        />
      </div>

      <div className="mt-14 relative group">
        {/* edge fades — tonal, not hard cuts */}
        <div className="absolute inset-y-0 left-0 w-10 sm:w-24 bg-gradient-to-r from-bg to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-10 sm:w-24 bg-gradient-to-l from-bg to-transparent z-10 pointer-events-none" />

        {/* CSS keyframe marquee on a duplicated track: hover really pauses
            (play-state is CSS-owned), and prefers-reduced-motion falls back
            to a static wrapping grid — see .marquee-track in index.css. */}
        <div
          className="marquee-track flex gap-6 w-max group-hover:[animation-play-state:paused]"
          style={{ ['--marquee-duration' as string]: '50s' }}
        >
          {items.map((t, i) => (
            <article
              key={i}
              aria-hidden={i >= testimonials.length || undefined}
              className={`w-[min(320px,calc(100vw-3rem))] sm:w-[440px] shrink-0 ambient-float p-6 sm:p-7 relative overflow-hidden ${
                i % 2 === 0 ? 'tier-3' : 'tier-1'
              }`}
            >
              {/* product chip */}
              <Link to="/store" className="chip-resource text-primary hover:bg-surface-container transition">
                <ShoppingBag size={11} /> {t.product}
              </Link>

              {/* 5-star row */}
              <div className="mt-4 flex items-center gap-0.5 text-amber-500">
                {[0,1,2,3,4].map((s) => (
                  <Star key={s} size={13} fill="currentColor" strokeWidth={0} />
                ))}
                <span className="ml-2 text-[10.5px] font-num text-muted tracking-wider">5.0 verified</span>
              </div>

              <Quote size={22} className="mt-4 text-primary opacity-70" />
              <p className="mt-2 text-base leading-relaxed text-ink">
                &ldquo;{t.quote}&rdquo;
              </p>

              <footer className="mt-6 pt-5 flex items-center gap-3 surface-low -mx-3 px-3 rounded-xl pb-3 -mb-3">
                <span className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-soft grid place-items-center text-on-primary text-sm font-bold ambient-float">
                  {(t.name?.[0] ?? '?').toUpperCase()}
                </span>
                <div className="text-sm">
                  <div className="font-semibold text-ink">{t.name || 'Anonymous'}</div>
                  <div className="text-ink-soft text-xs">{t.role}</div>
                </div>
              </footer>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-12 max-w-content mx-auto px-4 sm:px-6 text-center">
        <Link to="/store" className="btn-tertiary text-sm">
          See every product · browse the store
          <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}
