/** Tiny responsive helpers — single source of truth for breakpoints. */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

export const isTouch = () =>
  typeof window !== 'undefined' &&
  (('ontouchstart' in window) || navigator.maxTouchPoints > 0);

export const isMobile = () =>
  typeof window !== 'undefined' && window.matchMedia(`(max-width: ${breakpoints.md}px)`).matches;

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
