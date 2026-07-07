import type { Variants } from 'framer-motion';

/* Easing — same Apple-style cubic everywhere */
const EASE = [0.22, 1, 0.36, 1] as const;

/* Reveals — bumped offsets and durations so the motion actually reads on screen */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 56, filter: 'blur(6px)' },
  show:   { opacity: 1, y: 0,  filter: 'blur(0px)',
            transition: { duration: 0.85, ease: EASE } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.7, ease: EASE } },
};

export const stagger: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.1, delayChildren: 0.06 } },
};

export const staggerFast: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.045 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show:   { opacity: 1, scale: 1, transition: { duration: 0.7, ease: EASE } },
};

/** Slide in from the left/right — used for asymmetric reveals */
export const slideLeft: Variants = {
  hidden: { opacity: 0, x: -48 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.85, ease: EASE } },
};
export const slideRight: Variants = {
  hidden: { opacity: 0, x: 48 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.85, ease: EASE } },
};
