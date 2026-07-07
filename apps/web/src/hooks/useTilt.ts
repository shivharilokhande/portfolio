import { useRef, useCallback } from 'react';

/**
 * Mouse-driven 3D tilt for cards (Meta-style).
 * Generic over the host element so it can attach to <div>, <a>, <button>, etc.
 * Returns a ref to attach + onMouseMove/Leave handlers.
 */
export function useTilt<T extends HTMLElement = HTMLElement>(max = 10) {
  const ref = useRef<T | null>(null);

  const onMove = useCallback(
    (e: React.MouseEvent<T>) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const rx = (py - 0.5) * -2 * max;
      const ry = (px - 0.5) *  2 * max;
      el.style.setProperty('--rx', `${rx}deg`);
      el.style.setProperty('--ry', `${ry}deg`);
      el.style.setProperty('--mx', `${px * 100}%`);
      el.style.setProperty('--my', `${py * 100}%`);
    },
    [max],
  );

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  }, []);

  return { ref, onMove, onLeave };
}
