/**
 * ScrollToHash — makes `<a href="/#section">` links work reliably even
 * when the destination section is inside a lazy-loaded route.
 *
 *   The browser only performs its native anchor scroll once, right when
 *   the URL changes. If the target element isn't in the DOM yet (because
 *   the route is Suspense-suspended), that native scroll no-ops and the
 *   viewport stays at the top of the page.
 *
 *   This component watches `location.hash` and, whenever it changes,
 *   polls for the target element every 100 ms for up to 3 seconds. As
 *   soon as it appears, it scrolls into view.  Repeat clicks on the same
 *   hash also re-scroll (browser only re-scrolls on hash change).
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToHash() {
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash;
    if (!hash || hash.length <= 1) return;
    const id = hash.slice(1);

    let elapsed = 0;
    const step = 100;
    const timeout = 3000;
    // Track every scheduled timer so the cleanup can cancel a poll that's
    // still in flight when the hash changes or the component unmounts.
    let currentTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      elapsed += step;
      if (elapsed < timeout) {
        currentTimer = setTimeout(tick, step);
      }
    };
    // Small initial delay so a route transition + Suspense mount has a
    // chance to settle before we start polling for the element.
    currentTimer = setTimeout(tick, 60);
    return () => {
      cancelled = true;
      if (currentTimer !== null) clearTimeout(currentTimer);
    };
  }, [location.hash, location.pathname]);

  return null;
}
