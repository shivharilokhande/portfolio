/**
 * Skills — Luminous Engine bento grid.
 *
 *   Tonal layering (no borders), Space Grotesk numerals, primary green
 *   gradient accents per pillar, asymmetric stat strip + radar pairing.
 */
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Layers, Trophy, Activity } from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import SafeCanvas, { detectWebGL } from '../components/SafeCanvas';
import RadarChart from '../components/RadarChart';
import { skillCategories as staticSkillCategories } from '../lib/data';
import { useSection } from '../hooks/usePortfolioContent';
import { copyDefaults, mergeCopy } from '../lib/copyDefaults';
import { fadeUp, stagger } from '../lib/motion';

const SkillsCanvas = lazy(() => import('../components/three/SkillsCanvas'));

type SkillCategories = typeof staticSkillCategories;

function SkillsCSSFallback({ categories }: { categories: SkillCategories }) {
  return (
    <div className="absolute inset-0 grid place-items-center overflow-hidden" aria-hidden>
      <div className="relative w-[70%] aspect-square">
        {categories.flatMap((c) => c.skills).map((_, i, all) => {
          const a = (i / all.length) * Math.PI * 2;
          const r = 38 + (i % 3) * 6;
          const x = 50 + Math.cos(a) * r;
          const y = 50 + Math.sin(a) * r;
          const color = categories[i % categories.length].color;
          return (
            <span
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                left: `${x}%`, top: `${y}%`,
                background: color,
                boxShadow: `0 0 12px ${color}66`,
                transform: 'translate(-50%,-50%)',
                animation: `float 5s ease-in-out ${i * 0.07}s infinite`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/** True once `ref` has come within `rootMargin` of the viewport (sticky).
 *  Used to defer the three.js bundle until the cluster is about to show. */
function useNearViewport<T extends Element>(ref: RefObject<T>, rootMargin = '400px'): boolean {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === 'undefined') { setNear(true); return; }
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); } },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, near, rootMargin]);
  return near;
}

const avg = (a: { level: number }[]) => Math.round(a.reduce((s, x) => s + x.level, 0) / Math.max(1, a.length));
const peak = (a: { level: number }[]) => (a.length ? Math.max(...a.map((x) => x.level)) : 0);

/** CMS-driven section header. Lives outside `Skills` so the parent stays
 *  focused on layout — the header itself is edited from
 *  /admin/portfolio → Site copy. */
function SkillsHeader() {
  const h = mergeCopy(useSection('copy', copyDefaults)).sectionHeaders.skills;
  return <SectionHeader eyebrow={h.eyebrow} title={h.title} description={h.description} />;
}

export default function Skills() {
  const skillCategories = useSection<typeof staticSkillCategories>('skills', staticSkillCategories);
  const webglOk = useMemo(detectWebGL, []);
  const clusterRef = useRef<HTMLDivElement>(null);
  const clusterNear = useNearViewport(clusterRef);

  const allSkills = useMemo(() => skillCategories.flatMap((c) => c.skills), [skillCategories]);
  const totalSkills = allSkills.length;
  const overallAvg  = useMemo(() => avg(allSkills), [allSkills]);
  const topSkill    = useMemo(
    () => allSkills.reduce((best, s) => (s.level > best.level ? s : best), allSkills[0]),
    [allSkills],
  );
  const headlineStat = [
    { icon: <Layers   size={14} />, value: totalSkills,            label: 'skills mapped'  },
    { icon: <Trophy   size={14} />, value: topSkill?.name ?? '—',  label: 'top discipline' },
    { icon: <Activity size={14} />, value: `${overallAvg}%`,       label: 'avg proficiency'},
    { icon: <Cpu      size={14} />, value: skillCategories.length, label: 'core pillars'   },
  ];

  const radarAxes   = skillCategories.map((c) => c.label);
  const radarValues = skillCategories.map((c) => peak(c.skills));
  const radarColors = skillCategories.map((c) => c.color);

  return (
    <section id="skills" className="relative py-24 sm:py-32 overflow-hidden">
      {/* Soft primary aurora — light, never dominant */}
      <motion.div
        aria-hidden
        className="absolute -top-32 -left-20 w-[40rem] h-[40rem] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(closest-side, rgba(0,209,102,0.16), transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{ x: [0, 20, 0], y: [0, 30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute -bottom-32 -right-20 w-[44rem] h-[44rem] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(closest-side, rgba(10,92,207,0.10), transparent 70%)',
          filter: 'blur(90px)',
        }}
        animate={{ x: [0, -25, 0], y: [0, -20, 0] }}
        transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 max-w-content mx-auto px-4 sm:px-6">
        <SkillsHeader />

        {/* HEADLINE STAT STRIP — alternating tiers for asymmetry */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          viewport={{ once: true, amount: 0.3 }}
          className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
        >
          {headlineStat.map((s, i) => (
            <motion.div
              variants={fadeUp}
              key={s.label}
              className={`${i % 2 === 0 ? 'tier-3' : 'tier-2'} ambient-float p-5 relative overflow-hidden`}
            >
              <div className="flex items-center gap-2 text-label-sm text-primary">
                {s.icon}
                {s.label}
              </div>
              <div className="mt-3 font-num font-semibold text-2xl truncate text-gradient leading-none">
                {s.value}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CLUSTER + RADAR — the showpiece */}
        <div className="mt-8 grid lg:grid-cols-12 gap-6">
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 relative tier-3 ambient-float-lg overflow-hidden h-[480px] sm:h-[540px]"
          >
            <div className="absolute top-4 left-4 z-10 chip-status-active">
              <span className="dot-live" /> live · cluster
            </div>

            {/* Canvas fill — absolute inset-0 so the R3F canvas always matches
                the parent regardless of sibling layout. */}
            <div ref={clusterRef} className="absolute inset-0">
              {webglOk && clusterNear ? (
                <SafeCanvas fallback={<SkillsCSSFallback categories={skillCategories} />}>
                  <Suspense fallback={<SkillsCSSFallback categories={skillCategories} />}>
                    <SkillsCanvas categories={skillCategories} />
                  </Suspense>
                </SafeCanvas>
              ) : (
                <SkillsCSSFallback categories={skillCategories} />
              )}
            </div>

            <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between text-label-sm text-muted pointer-events-none">
              <span>Drag · hover · explore</span>
              <span className="font-num">{totalSkills} skills · {skillCategories.length} pillars</span>
            </div>
          </motion.div>

          {/* RADAR — sits on tier-2 (one step deeper) for tonal contrast vs the cluster */}
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
            className="lg:col-span-5 relative tier-2 p-6 flex flex-col"
          >
            <div className="flex items-center justify-between">
              <div className="chip-resource">
                <span className="dot-live" />
                radar · peak %
              </div>
              <span className="font-num text-xs text-muted">{radarAxes.length} axes</span>
            </div>

            <div className="flex-1 grid place-items-center mt-2">
              <RadarChart
                axes={radarAxes}
                values={radarValues}
                colors={radarColors}
                size={360}
              />
            </div>

            <ul className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
              {skillCategories.map((c, i) => (
                <li key={c.id} className="flex items-center gap-2 truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: c.color, boxShadow: `0 0 8px ${c.color}55` }}
                  />
                  <span className="text-ink-soft truncate">{c.label}</span>
                  <span className="ml-auto font-num text-ink">{radarValues[i]}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* CATEGORY TILES — alternating widths break the standard grid */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          viewport={{ once: true, amount: 0.15 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
        >
          {skillCategories.map((c, i) => {
            const a = avg(c.skills);
            const p = peak(c.skills);
            return (
              <motion.article
                key={c.id}
                variants={fadeUp}
                whileHover={{ y: -3 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                className={`group relative overflow-hidden p-6 ambient-float ${
                  i % 2 === 0 ? 'tier-3' : 'tier-1'
                }`}
              >
                {/* category accent — tinted blob in the corner */}
                <span
                  aria-hidden
                  className="absolute -right-14 -top-14 w-44 h-44 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"
                  style={{ background: c.color }}
                />

                <header className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-label-sm text-ink-soft inline-flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: c.color }}
                      />
                      Pillar 0{i + 1}
                    </span>
                    <h3 className="mt-2 font-display font-semibold text-lg leading-tight truncate tracking-tight">
                      {c.label}
                    </h3>
                  </div>
                  <div className="shrink-0 text-right" title={`Top: ${p}% · Avg: ${a}%`}>
                    <div
                      className="font-num font-semibold text-3xl leading-none tracking-tight"
                      style={{ color: c.color }}
                    >
                      {p}<span className="text-base font-medium text-muted">%</span>
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted mt-1">
                      peak · avg {a}
                    </div>
                  </div>
                </header>

                <ul className="relative mt-5 space-y-2.5">
                  {c.skills.map((s) => (
                    <li key={s.name}>
                      <div className="flex justify-between text-xs text-ink-soft">
                        <span className="truncate pr-2">{s.name}</span>
                        <span className="font-num text-ink">{s.level}</span>
                      </div>
                      <div className="mt-1 h-1 rounded-full surface-low overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${s.level}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full rounded-full"
                          style={{ background: c.color }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
