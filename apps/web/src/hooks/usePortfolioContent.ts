/**
 * usePortfolioContent — live CMS data with static fallback.
 *
 *  Architecture is intentionally dumb-simple:
 *    DB is the only source of truth. The public site polls /api/portfolio
 *    every POLL_INTERVAL_MS and on tab focus. There is no BroadcastChannel,
 *    no localStorage signal, no SSE — those mechanisms can be flaky across
 *    browsers/HMR. Polling always works.
 *
 *  Section components read their slice via useSection(key, fallback).
 *
 *  Fallback rules:
 *   - API unreachable / key missing / null / empty array → static fallback
 *   - Otherwise live API value
 */
import React, {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { onPortfolioChanged } from '../lib/portfolioBus';

type Sections = Record<string, unknown>;

type Ctx = {
  sections: Sections;
  ready:    boolean;
  error:    Error | null;
  refetch:  () => void;
};

const PortfolioContext = createContext<Ctx>({
  sections: {}, ready: false, error: null, refetch: () => {},
});

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

/** 20-second safety-net poll when the tab is visible. Admin edits are pushed
    instantly via BroadcastChannel (portfolioBus) so this is only a fallback
    for cross-device sync. Kept generous to avoid the API rate limit — each
    poll fires (1 list + N section reads). */
const POLL_INTERVAL_MS = 20_000;

const DEV = (typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV) || false;

export function PortfolioContentProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [sections, setSections] = useState<Sections>({});
  const [ready, setReady]       = useState(false);
  const [error, setError]       = useState<Error | null>(null);

  // Monotonic request id — only the latest fetch is allowed to commit.
  // Prevents a slow poll from overwriting fresh state a subsequent poll set.
  const reqIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const myId = ++reqIdRef.current;
    const noCache: RequestInit = {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    };
    try {
      if (DEV) console.log('[live-cms] refetch start', myId);
      const list = (await fetch(`${API_BASE}/api/portfolio`, noCache).then((r) => {
        if (!r.ok) throw new Error('list failed');
        return r.json();
      })) as { key: string; label: string }[];

      const bodies = await Promise.all(
        list.map((s) =>
          fetch(`${API_BASE}/api/portfolio/${s.key}`, noCache)
            .then((r) => (r.ok ? r.json() : null))
            .then((body) => [s.key, body] as const)
            .catch(() => [s.key, null] as const),
        ),
      );

      // If a newer refetch has started, drop this result.
      if (reqIdRef.current !== myId) {
        if (DEV) console.log('[live-cms] refetch', myId, 'superseded — dropping');
        return;
      }

      const merged: Sections = {};
      for (const [k, v] of bodies) merged[k] = v;
      setSections(merged);
      setError(null);
      setReady(true);
      if (DEV) console.log('[live-cms] refetch done', myId, '· sections =', Object.keys(merged).length);
    } catch (e) {
      if (reqIdRef.current !== myId) return;
      setError(e as Error);
      setReady(true);
      if (DEV) console.warn('[live-cms] refetch failed', myId, e);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await refetch();
    })();
    return () => { cancelled = true; };
  }, [refetch]);

  // Refetch when the public tab regains visibility
  useEffect(() => {
    function onVis() {
      if (document.visibilityState === 'visible') refetch();
    }
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refetch]);

  // 5-second poll. Only fires while the tab is visible so we don't hammer
  // the API for backgrounded tabs.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') refetch();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [refetch]);

  // Instant push from an admin save (same browser). BroadcastChannel +
  // localStorage-storage event + same-tab CustomEvent — all covered by
  // lib/portfolioBus. Admin's adminApi.updateSection calls notifyPortfolioChanged
  // after every successful PUT.
  useEffect(() => {
    const off = onPortfolioChanged(() => {
      if (DEV) console.log('[live-cms] admin push received → refetch');
      refetch();
    });
    return off;
  }, [refetch]);

  const value = useMemo<Ctx>(() => ({ sections, ready, error, refetch }),
                            [sections, ready, error, refetch]);
  return createElement(PortfolioContext.Provider, { value }, children);
}

/** Read a section. Falls back to static defaults when API is silent or empty. */
export function useSection<T>(key: string, fallback: T): T {
  const ctx = useContext(PortfolioContext);
  const v = ctx.sections[key];
  if (v == null) return fallback;
  if (Array.isArray(v) && v.length === 0) return fallback;
  if (typeof v === 'object' && v !== null && !Array.isArray(v)
      && Object.keys(v as Record<string, unknown>).length === 0) {
    return fallback;
  }
  return v as T;
}

/** Whether the live data has finished loading (true even if the API errored). */
export function usePortfolioReady(): boolean {
  return useContext(PortfolioContext).ready;
}

/** Imperatively trigger a refetch — used by admin / preview tooling. */
export function usePortfolioRefetch(): () => void {
  return useContext(PortfolioContext).refetch;
}
