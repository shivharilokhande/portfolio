/**
 * ScrollAurora — full-page atmospheric backdrop tied to scroll progress.
 *
 *   Two large primary/secondary blobs that pan, rotate and scale as the user
 *   scrolls. Gives the Luminous Engine page a continuous "scroll = motion"
 *   feedback loop without the heavy dark cinema frames it replaced.
 *
 *   Fixed-position, behind everything (z = -1 inside the page), pointer-events
 *   none. Respects prefers-reduced-motion via Framer Motion defaults.
 */
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

export default function ScrollAurora() {
  const { scrollYProgress } = useScroll();

  // Spring-smoothed progress so the parallax never feels twitchy
  const p = useSpring(scrollYProgress, { stiffness: 80, damping: 22, mass: 0.6 });

  // Blob 1 — primary green, drifts down + right
  const b1X = useTransform(p, [0, 1], ['-10%', '12%']);
  const b1Y = useTransform(p, [0, 1], ['-12%', '40%']);
  const b1S = useTransform(p, [0, 1], [1, 1.25]);
  const b1R = useTransform(p, [0, 1], [0, 40]);

  // Blob 2 — secondary water-blue, drifts up + left
  const b2X = useTransform(p, [0, 1], ['18%', '-14%']);
  const b2Y = useTransform(p, [0, 1], ['38%', '-8%']);
  const b2S = useTransform(p, [0, 1], [1.1, 0.9]);
  const b2R = useTransform(p, [0, 1], [0, -55]);

  // Blob 3 — primary-soft glow, slow-orbit
  const b3X = useTransform(p, [0, 1], ['40%', '8%']);
  const b3Y = useTransform(p, [0, 1], ['10%', '70%']);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden>
      <motion.div
        style={{ x: b1X, y: b1Y, scale: b1S, rotate: b1R }}
        className="absolute -left-[10%] top-0 w-[60vw] h-[60vw] rounded-full blur-3xl opacity-60"
      >
        <div
          className="w-full h-full"
          style={{ background: 'radial-gradient(closest-side, rgba(0,209,102,0.32), transparent 70%)' }}
        />
      </motion.div>

      <motion.div
        style={{ x: b2X, y: b2Y, scale: b2S, rotate: b2R }}
        className="absolute -right-[14%] top-[20%] w-[55vw] h-[55vw] rounded-full blur-3xl opacity-50"
      >
        <div
          className="w-full h-full"
          style={{ background: 'radial-gradient(closest-side, rgba(10,92,207,0.20), transparent 70%)' }}
        />
      </motion.div>

      <motion.div
        style={{ x: b3X, y: b3Y }}
        className="absolute w-[40vw] h-[40vw] rounded-full blur-3xl opacity-40"
      >
        <div
          className="w-full h-full"
          style={{ background: 'radial-gradient(closest-side, rgba(0,109,50,0.18), transparent 70%)' }}
        />
      </motion.div>

      {/* Subtle dot grid that drifts on scroll */}
      <motion.div
        style={{ y: useTransform(p, [0, 1], ['0%', '-12%']) }}
        className="absolute inset-0 opacity-[0.035]"
      >
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dotgrid" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill="rgb(11,28,48)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dotgrid)" />
        </svg>
      </motion.div>
    </div>
  );
}
