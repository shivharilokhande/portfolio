/**
 * Services — Luminous Engine engagement cards.
 *
 *   Tonal tiers (no borders), primary energy gradient for the featured card,
 *   ambient float, soft tinted halo per service.
 */
import { motion } from 'framer-motion';
import {
  Check, Sparkles, ShieldCheck, Clock, Award, BadgeCheck,
  Layers, Briefcase, Compass, Code2,
} from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import { services as staticServices, type Service } from '../lib/data';
import { useSection } from '../hooks/usePortfolioContent';
import { copyDefaults, mergeCopy } from '../lib/copyDefaults';
import { fadeUp, stagger } from '../lib/motion';

const trustBadges = [
  { icon: <Award size={14} />,       label: 'CSM (2025) · PMP in progress (2026)' },
  { icon: <BadgeCheck size={14} />,  label: '6 years · IIT · Accenture · Deloitte · EY · CES' },
  { icon: <ShieldCheck size={14} />, label: 'NDA · clean IP on every engagement' },
  { icon: <Clock size={14} />,       label: 'Replies within 24 hours' },
];

const accentRing: Record<Service['accent'], string> = {
  brand:   'rgb(var(--primary))',
  brand2:  'rgb(var(--secondary))',
  accent:  'rgb(var(--primary-soft))',
  emerald: '#10b981',
};

const iconFor: Record<string, React.ReactNode> = {
  'Workiva Expert':    <Layers size={16} />,
  'Tech Lead':         <Briefcase size={16} />,
  'Scrum Master':      <Compass size={16} />,
  'Backend Developer': <Code2 size={16} />,
};

/** CMS-driven header for the Services section. */
function ServicesHeader() {
  const h = mergeCopy(useSection('copy', copyDefaults)).sectionHeaders.services;
  return <SectionHeader eyebrow={h.eyebrow} title={h.title} description={h.description} />;
}

export default function Services() {
  const services = useSection<Service[]>('services', staticServices);
  return (
    <section id="services" className="relative py-24 sm:py-32">
      <div className="max-w-content mx-auto px-4 sm:px-6">
        <ServicesHeader />

        {/* Trust badges row — resource chips */}
        <motion.ul
          variants={stagger}
          initial="hidden"
          animate="show"
          viewport={{ once: true, amount: 0.4 }}
          className="mt-10 flex flex-wrap gap-2.5"
        >
          {trustBadges.map((b) => (
            <motion.li
              key={b.label}
              variants={fadeUp}
              className="chip-resource hover:bg-surface-container transition-colors"
            >
              <span className="text-primary">{b.icon}</span>
              {b.label}
            </motion.li>
          ))}
        </motion.ul>

        {/* pt-4 leaves room above each card for the floating chip to peek without being clipped */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 pt-4"
        >
          {services.map((s, i) => {
            const color = accentRing[s.accent];
            const tier = s.featured ? 'tier-3' : (i % 2 === 0 ? 'tier-1' : 'tier-3');
            return (
              <motion.article
                variants={fadeUp}
                key={s.name}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                /* OUTER wrapper — no overflow-hidden, so the floating chip
                   can sit above the card. The tinted blob is masked inside. */
                className="relative"
              >
                {/* Floating tag — sits above the card */}
                {s.tag && (
                  <span
                    className={`absolute -top-3 right-5 z-10 inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      s.featured
                        ? 'bg-gradient-to-br from-primary to-primary-soft text-on-primary ambient-float'
                        : 'surface-lowest ghost-line text-primary ambient-float'
                    }`}
                  >
                    {s.featured && <Sparkles size={11} />} {s.tag}
                  </span>
                )}

                {/* INNER card — overflow-hidden so the corner blob is masked */}
                <div className={`relative p-7 ${tier} overflow-hidden ${
                  s.featured ? 'ambient-float-lg shadow-glow' : 'ambient-float'
                }`}>
                  {/* tinted halo */}
                  <span
                    aria-hidden
                    className="absolute -right-14 -top-14 w-44 h-44 rounded-full blur-3xl opacity-30"
                    style={{ background: color }}
                  />

                  <div className="relative">
                    <div
                      className="w-11 h-11 rounded-xl grid place-items-center"
                      style={{
                        background: `linear-gradient(135deg, ${color}22, ${color}10)`,
                        color,
                      }}
                    >
                      {iconFor[s.name] ?? <Check size={16} />}
                    </div>
                    <h3 className="mt-5 font-display text-lg sm:text-xl tracking-tight leading-tight">{s.name}</h3>
                    <p className="mt-2 text-sm text-ink-soft leading-relaxed">{s.blurb}</p>

                    <ul className="mt-6 space-y-3 text-sm">
                      {s.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2.5">
                          <span
                            className="mt-0.5 w-4 h-4 rounded-full grid place-items-center shrink-0"
                            style={{ background: `${color}1c`, color }}
                          >
                            <Check size={10} strokeWidth={3} />
                          </span>
                          <span className="text-ink">{b}</span>
                        </li>
                      ))}
                    </ul>

                    <p className="mt-6 inline-flex items-center gap-1.5 text-[11px] text-muted">
                      <ShieldCheck size={12} className="text-primary" />
                      Free 30-min discovery call · scope &amp; pricing on the call
                    </p>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
