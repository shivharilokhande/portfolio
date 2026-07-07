import { motion } from 'framer-motion';
import { fadeUp, stagger } from '../lib/motion';

/**
 * Editorial section header — eyebrow uses a small primary dash + uppercase label,
 * the title uses Space Grotesk display, and the description sits on ink-soft.
 * No 1px lines anywhere — the dash is a small primary swatch, not a divider.
 */
export default function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'left',
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
}) {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      viewport={{ once: true, amount: 0.4 }}
      className={`max-w-3xl ${align === 'center' ? 'mx-auto text-center' : ''}`}
    >
      <motion.div variants={fadeUp} className="inline-flex items-center gap-3 text-label-md text-primary">
        <span className="inline-block w-6 h-[3px] rounded-full bg-gradient-to-r from-primary to-primary-soft" />
        {eyebrow}
      </motion.div>
      <motion.h2 variants={fadeUp} className="mt-4 font-display text-headline-lg text-ink tracking-tight">
        {title}
      </motion.h2>
      {description && (
        <motion.p variants={fadeUp} className="mt-4 text-ink-soft text-base sm:text-lg leading-relaxed max-w-2xl">
          {description}
        </motion.p>
      )}
    </motion.div>
  );
}
