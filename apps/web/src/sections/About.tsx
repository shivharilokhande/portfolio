import { motion } from 'framer-motion';
import SectionHeader from '../components/SectionHeader';
import {
  profile as staticProfile,
  stats as staticStats,
  education as staticEducation,
  certifications as staticCertifications,
} from '../lib/data';
import { useSection } from '../hooks/usePortfolioContent';
import { copyDefaults, mergeCopy } from '../lib/copyDefaults';
import { fadeUp, stagger } from '../lib/motion';
import { Award, Briefcase, Code2, GraduationCap, ShieldCheck } from 'lucide-react';

// Map admin-selectable icon slugs to real lucide-react components. Keeps the
// admin form simple (a select of slugs) while allowing structured pillars
// rendered with actual icons.
const iconMap: Record<string, React.ReactNode> = {
  code:       <Code2       size={18} />,
  briefcase:  <Briefcase   size={18} />,
  graduation: <GraduationCap size={18} />,
  shield:     <ShieldCheck size={18} />,
  award:      <Award       size={18} />,
};

export default function About() {
  const profile        = useSection<typeof staticProfile>('profile', staticProfile);
  const stats          = useSection<typeof staticStats>('stats', staticStats);
  const education      = useSection<typeof staticEducation>('education', staticEducation);
  const certifications = useSection<typeof staticCertifications>('certifications', staticCertifications);
  const copy           = mergeCopy(useSection('copy', copyDefaults));
  const header         = copy.sectionHeaders.about;
  const pillars        = copy.aboutPillars;

  return (
    <section id="about" className="relative py-24 sm:py-32">
      {/* Section sits on the page surface; cards use surface-low / surface-lowest to lift */}
      <div className="max-w-content mx-auto px-4 sm:px-6 grid lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-5">
          <SectionHeader
            eyebrow={header.eyebrow}
            title={header.title}
            /* Empty CMS description falls back to the profile one-liner so
               admins get sensible default copy without duplicating it. */
            description={header.description?.trim() ? header.description : profile.oneLiner}
          />
        </div>

        {/* Stats + pillars — alternating widths to break the standard grid */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          viewport={{ once: true, amount: 0.3 }}
          className="lg:col-span-7 grid sm:grid-cols-2 gap-5"
        >
          {stats.map((s, idx) => (
            <motion.div
              variants={fadeUp}
              key={s.label}
              className={`tier-3 ambient-float p-6 ${idx === 1 ? 'sm:translate-y-6' : ''}`}
            >
              <div className="font-num font-semibold text-5xl text-gradient leading-none tracking-tight">
                {s.value}
              </div>
              <div className="mt-3 text-label-sm text-ink-soft">{s.label}</div>
            </motion.div>
          ))}

          {pillars.map((p) => (
            <motion.div
              variants={fadeUp}
              key={p.title}
              className="tier-2 p-6"
            >
              <div className="w-10 h-10 rounded-xl grid place-items-center surface-lowest text-primary ambient-float">
                {iconMap[p.icon] ?? iconMap.code}
              </div>
              <h3 className="mt-4 font-display text-lg tracking-tight">{p.title}</h3>
              <p className="text-sm text-ink-soft mt-2 leading-relaxed">{p.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Education + Certifications — tonal cards on the same page surface */}
      <div className="mt-20 max-w-content mx-auto px-4 sm:px-6 grid lg:grid-cols-[1.1fr_1fr] gap-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          viewport={{ once: true, amount: 0.3 }}
          className="tier-3 ambient-float p-7"
        >
          <div className="flex items-center gap-2 text-primary">
            <GraduationCap size={16} />
            <h3 className="text-label-md">Education</h3>
          </div>
          <ul className="mt-5 space-y-4">
            {education.map((e, i) => (
              <li
                key={e.degree}
                className={`flex justify-between gap-4 ${
                  i !== education.length - 1 ? 'pb-4 surface-low rounded-xl p-3 -mx-1' : ''
                }`}
              >
                <div>
                  <p className="font-semibold text-ink">{e.degree}</p>
                  <p className="text-xs text-ink-soft mt-0.5">{e.school}</p>
                </div>
                <span className="font-num text-xs text-muted whitespace-nowrap pt-1">{e.year}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          viewport={{ once: true, amount: 0.3 }}
          className="tier-1 p-7"
        >
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck size={16} />
            <h3 className="text-label-md">Certifications</h3>
          </div>
          <ul className="mt-5 space-y-3">
            {certifications.map((c) => (
              <li key={c.name} className="flex justify-between gap-4">
                <span className="text-sm text-ink">{c.name}</span>
                <span className="font-num text-xs text-muted whitespace-nowrap">{c.year}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
