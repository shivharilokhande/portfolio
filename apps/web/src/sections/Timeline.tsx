/**
 * Timeline — editorial narrative flow.
 *
 *   Light tonal cards, primary green spine that grows with scroll,
 *   Space Grotesk chapter numerals, alternating widths for asymmetry.
 */
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { MapPin } from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import { timeline as staticTimeline } from '../lib/data';
import { useSection } from '../hooks/usePortfolioContent';
import { copyDefaults, mergeCopy } from '../lib/copyDefaults';

/** CMS-driven header for the Journey section — edited from admin. */
function TimelineHeader() {
  const h = mergeCopy(useSection('copy', copyDefaults)).sectionHeaders.timeline;
  return <SectionHeader eyebrow={h.eyebrow} title={h.title} description={h.description} />;
}

export default function Timeline() {
  const timeline = useSection<typeof staticTimeline>('timeline', staticTimeline);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 80%', 'end 20%'],
  });
  const spineHeight = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <section id="timeline" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="aurora bg-[radial-gradient(circle_at_50%_30%,rgba(0,209,102,0.10),transparent_55%)]" />

      <div className="relative z-10 max-w-content mx-auto px-4 sm:px-6">
        <TimelineHeader />

        <div ref={ref} className="relative mt-20">
          {/* Spine — outline-variant ghost line under, primary gradient growing */}
          <div className="absolute left-4 sm:left-1/2 top-0 -translate-x-1/2 w-px h-full bg-outline-variant/20" />
          <motion.div
            style={{ height: spineHeight }}
            className="absolute left-4 sm:left-1/2 top-0 -translate-x-1/2 w-px bg-gradient-to-b from-primary to-primary-soft"
          />

          <ol className="space-y-14 sm:space-y-20">
            {timeline.map((t, i) => {
              const left = i % 2 === 0;
              const chapter = String(timeline.length - i).padStart(2, '0');
              return (
                <motion.li
                  key={t.company}
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className={`relative sm:grid sm:grid-cols-2 sm:gap-12 ${left ? '' : 'sm:[&>*:first-child]:order-2'}`}
                >
                  {/* Spine dot — primary, ringed with the page bg to "punch through" the spine */}
                  <span className="absolute left-4 sm:left-1/2 -translate-x-1/2 top-3 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-primary to-primary-soft ring-4 ring-bg ambient-float" />

                  {/* META — chapter number, role, company */}
                  <motion.div
                    initial={false}
                    animate={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: 0.55, delay: 0.05 }}
                    className={`ml-12 sm:ml-0 ${left ? 'sm:pr-12 sm:text-right' : 'sm:pl-12'}`}
                  >
                    <div className={`flex items-center gap-3 ${left ? 'sm:justify-end' : ''}`}>
                      <span className="text-label-sm text-muted">Chapter</span>
                      <span className="font-num font-semibold text-4xl text-gradient leading-none tracking-tight">
                        {chapter}
                      </span>
                    </div>
                    <h3 className="mt-3 font-display text-xl sm:text-2xl tracking-tight">
                      {t.role}
                    </h3>
                    <p className="mt-1 text-sm text-ink-soft">{t.company}</p>
                    <p
                      className={`mt-2 inline-flex items-center gap-1.5 text-xs font-num text-primary ${
                        left ? 'sm:flex-row-reverse' : ''
                      }`}
                    >
                      <MapPin size={11} /> {t.location}
                    </p>
                    <p className="mt-1 text-xs font-num text-muted">{t.period}</p>
                  </motion.div>

                  {/* CARD — alternating tier-3 (white) / tier-1 (low) for tonal asymmetry */}
                  <motion.div
                    initial={false}
                    animate={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: 0.55, delay: 0.1 }}
                    className={`ml-12 sm:ml-0 mt-4 sm:mt-0 ${left ? 'sm:pl-12' : 'sm:pr-12'}`}
                  >
                    <div className={`relative p-6 overflow-hidden ambient-float ${
                      i % 2 === 0 ? 'tier-3' : 'tier-1'
                    }`}>
                      <span
                        aria-hidden
                        className="absolute -right-12 -top-12 w-40 h-40 rounded-full blur-3xl opacity-20"
                        style={{ background: i % 2 === 0 ? 'rgb(0,209,102)' : 'rgb(10,92,207)' }}
                      />
                      <ul className="relative space-y-3 text-sm">
                        {t.highlights.map((h) => (
                          <li key={h} className="flex gap-3">
                            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            <span className="text-ink-soft leading-relaxed">{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
