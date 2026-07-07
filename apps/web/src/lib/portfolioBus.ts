/**
 * Tiny cross-tab signal bus for "CMS content changed".
 *
 *   Two topics: 'portfolio' (About/Hero/Skills/etc.) and 'store'
 *   (products created / updated / deleted / asset uploaded). Public tabs
 *   subscribe to the topic they care about and refetch on any pulse.
 *
 *   Mechanisms (in priority order):
 *     1. BroadcastChannel — instant push, same browser, all tabs.
 *     2. localStorage `storage` event — fallback for browsers without
 *        BroadcastChannel (Safari ≤ 15.3, some embedded webviews).
 *     3. CustomEvent on `window` — same-tab fallback (when admin and public
 *        somehow share a single window, e.g. preview mode).
 *
 *   Cross-device sync (different machines / browsers) is handled by
 *   polling — usePortfolioContent for portfolio, storeSync hooks for products.
 */

type Topic = 'portfolio' | 'store';
type Pulse = { topic: Topic; key?: string; at: number };

// Generic identifiers — never reference the site owner so a template buyer
// hosting multiple sibling deployments doesn't get cross-instance collisions
// on shared origins.
const CHANNEL = 'portfolio-cms';
const STORAGE_KEY = 'portfolio.cms.pulse';
const WINDOW_EVENT = 'portfolio:cms-changed';
const DEV = (typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV) || false;

let channel: BroadcastChannel | null = null;
function bc(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (channel) return channel;
  if (typeof BroadcastChannel === 'undefined') return null;
  channel = new BroadcastChannel(CHANNEL);
  return channel;
}

function push(pulse: Pulse): void {
  if (DEV) console.log('[live-cms] notify →', pulse);
  try { bc()?.postMessage(pulse); } catch { /* ignore */ }
  // Bump storage key AND write the payload so a `storage` event fires in other tabs.
  // Include timestamp in the key so identical payloads still trigger the event.
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pulse)); }
  catch { /* private mode / quota */ }
  try { window.dispatchEvent(new CustomEvent(WINDOW_EVENT, { detail: pulse })); }
  catch { /* ignore */ }
}

function subscribe(topic: Topic, handler: (pulse: Pulse) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const wrap = (label: string, pulse: Pulse) => {
    if (pulse.topic !== topic) return;
    if (DEV) console.log('[live-cms] received via', label, '→', pulse);
    handler(pulse);
  };

  const onBc = (e: MessageEvent) => {
    const data = e.data as Pulse | undefined;
    if (data && typeof data.at === 'number') wrap('BroadcastChannel', data);
  };
  bc()?.addEventListener('message', onBc);

  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      const pulse = JSON.parse(e.newValue) as Pulse;
      wrap('storage', pulse);
    } catch { /* ignore malformed */ }
  };
  window.addEventListener('storage', onStorage);

  const onCustom = (e: Event) => {
    const ce = e as CustomEvent<Pulse>;
    if (ce.detail && typeof ce.detail.at === 'number') wrap('CustomEvent', ce.detail);
  };
  window.addEventListener(WINDOW_EVENT, onCustom);

  return () => {
    bc()?.removeEventListener('message', onBc);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(WINDOW_EVENT, onCustom);
  };
}

/* -------------------- Portfolio (About / Hero / Projects / …) -------------------- */
export function notifyPortfolioChanged(key: string): void {
  push({ topic: 'portfolio', key, at: Date.now() });
}
export function onPortfolioChanged(handler: (pulse: Pulse) => void): () => void {
  return subscribe('portfolio', handler);
}

/* -------------------- Store (products) -------------------- */
export function notifyStoreChanged(key?: string): void {
  push({ topic: 'store', key, at: Date.now() });
}
export function onStoreChanged(handler: (pulse: Pulse) => void): () => void {
  return subscribe('store', handler);
}
