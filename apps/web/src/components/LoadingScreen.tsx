import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Editorial loading screen — Luminous Engine palette.
 * Sits on the light surface, lifts a tier-3 white card with ambient float,
 * and uses the primary green gradient for the progress bar.
 */
export default function LoadingScreen({
  progress,
  label = 'Preparing the experience',
  done,
  delayMs = 240,
}: {
  progress: number;
  label?:    string;
  done?:     boolean;
  delayMs?:  number;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (done || progress >= 100) {
      const id = setTimeout(() => setVisible(false), delayMs);
      return () => clearTimeout(id);
    }
  }, [done, progress, delayMs]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loading"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] grid place-items-center surface"
          role="status"
          aria-live="polite"
          aria-label={`${label}: ${Math.round(progress)} percent`}
        >
          {/* Soft primary aurora — never blue, never harsh */}
          <div className="aurora bg-[radial-gradient(circle_at_30%_30%,rgba(0,209,102,0.22),transparent_55%),radial-gradient(circle_at_70%_70%,rgba(0,109,50,0.16),transparent_55%)]" />

          <div className="relative tier-3 ambient-float-lg px-8 py-7 sm:px-10 sm:py-9 w-[min(92vw,520px)] text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-soft grid place-items-center shadow-glow">
              <span className="font-display font-bold text-on-primary text-xl">S</span>
            </div>

            <h2 className="mt-5 font-display text-lg sm:text-xl tracking-tight">{label}</h2>
            <p className="mt-1.5 text-xs text-muted">
              Just a moment — priming the layout, fonts, and live content.
            </p>

            <div className="mt-6 h-1.5 rounded-full bg-surface-low overflow-hidden ghost-line" aria-hidden>
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary-soft"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                transition={{ duration: 0.25, ease: 'linear' }}
              />
            </div>
            <div className="mt-2 font-num text-[11px] tabular-nums text-muted">
              {Math.round(progress).toString().padStart(3, '0')}%
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
