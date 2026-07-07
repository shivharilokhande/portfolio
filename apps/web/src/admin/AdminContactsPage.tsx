import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2, Mail, Building2, AlertCircle, Check, Archive, ShieldAlert, Search, RefreshCw,
} from 'lucide-react';
import { adminApi, type AdminContact } from './adminApi';

type ContactStatus = 'NEW' | 'REPLIED' | 'ARCHIVED' | 'SPAM';
const STATUSES: ('ALL' | ContactStatus)[] = ['ALL', 'NEW', 'REPLIED', 'ARCHIVED', 'SPAM'];

/** Auto-refresh cadence — admin routes skip the IP rate-limit bucket, so a
 *  30-second poll is safe and gives near-real-time inbox behaviour. */
const POLL_MS = 30_000;

export default function AdminContactsPage() {
  const [list, setList] = useState<AdminContact[] | null>(null);
  const [err, setErr]   = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | ContactStatus>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const reqRef = useRef(0);

  const load = useCallback(async () => {
    const myId = ++reqRef.current;
    setRefreshing(true);
    try {
      const data = await adminApi.contacts();
      if (reqRef.current !== myId) return;
      setList(data);
      setErr(null);
    } catch (e) {
      if (reqRef.current !== myId) return;
      setErr(e instanceof Error ? e.message : 'Failed to load contacts.');
    } finally {
      if (reqRef.current === myId) setRefreshing(false);
    }
  }, []);

  // Initial + polling + tab-focus refresh — so new inquiries show up without
  // manual reload. The rate limiter skips /api/admin/*.
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, POLL_MS);
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [load]);

  async function setStatus(id: number, status: ContactStatus) {
    setBusy(id);
    setErr(null);
    setList((prev) => prev?.map((c) => c.id === id ? { ...c, status } : c) ?? null);
    try {
      await adminApi.updateContactStatus(id, status);
    } catch (e) {
      setErr(e instanceof Error ? `Couldn't update inquiry #${id}: ${e.message}` : `Couldn't update inquiry #${id}.`);
      load();
    } finally { setBusy(null); }
  }

  const filtered = useMemo(() => {
    if (!list) return null;
    const q = query.trim().toLowerCase();
    return list.filter((c) => {
      if (filter !== 'ALL' && c.status !== filter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company?.toLowerCase().includes(q) ?? false) ||
        (c.projectType?.toLowerCase().includes(q) ?? false) ||
        c.message.toLowerCase().includes(q)
      );
    });
  }, [list, query, filter]);

  const counts = useMemo(() => {
    const out: Record<string, number> = { ALL: list?.length ?? 0 };
    for (const c of list ?? []) out[c.status] = (out[c.status] ?? 0) + 1;
    return out;
  }, [list]);

  return (
    <div>
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-label-md text-primary">inbox</p>
          <h1 className="mt-3 font-display text-3xl tracking-tight">Inquiries</h1>
          <p className="mt-1 text-ink-soft text-sm">Hire-me form submissions from /#contact, newest first · auto-refreshes every 30s.</p>
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg surface-low ghost-line text-sm text-ink-soft hover:text-ink transition disabled:opacity-50"
          aria-label="Refresh inquiries"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {err && (
        <p className="mt-6 inline-flex items-center gap-1.5 text-sm text-red-700">
          <AlertCircle size={14} /> {err}
        </p>
      )}

      {/* Filter bar */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted z-10" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, company, message…"
            className="input-clean pl-9 py-2"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full transition ${
                filter === s
                  ? 'bg-gradient-to-br from-primary to-primary-soft text-on-primary ambient-float'
                  : 'chip-resource hover:bg-surface-container'
              }`}
            >
              {s} <span className="opacity-70 font-num">{counts[s] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {!list && !err && (
        <div className="mt-6 tier-3 ambient-float p-10 grid place-items-center text-ink-soft text-sm">
          <Loader2 size={18} className="animate-spin" />
        </div>
      )}

      {filtered && filtered.length === 0 && (
        <div className="mt-6 tier-3 ambient-float p-10 text-center text-ink-soft text-sm">
          {list && list.length === 0 ? 'No submissions yet.' : 'No inquiries match this filter.'}
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <ul className="mt-6 space-y-3">
          {filtered.map((c, i) => (
            <li key={c.id} className={`${i % 2 === 0 ? 'tier-3' : 'tier-1'} ambient-float p-6`}>
              <header className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <h3 className="font-semibold text-ink">{c.name}</h3>
                  <p className="text-xs text-ink-soft mt-1">
                    <a href={`mailto:${c.email}`} className="hover:text-primary inline-flex items-center gap-1">
                      <Mail size={11} /> {c.email}
                    </a>
                    {c.company && (
                      <>
                        <span className="mx-2">·</span>
                        <span className="inline-flex items-center gap-1"><Building2 size={11} /> {c.company}</span>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`pill ${pillFor(c.status)}`}>{c.status}</span>
                  <p className="text-[10px] text-muted font-num">{new Date(c.createdAt).toLocaleString()}</p>
                </div>
              </header>

              {c.projectType && (
                <p className="mt-3 chip-resource text-primary">{c.projectType}</p>
              )}

              <p className="mt-4 text-sm whitespace-pre-wrap leading-relaxed text-ink">{c.message}</p>

              <footer className="mt-5 flex items-center justify-end gap-2 flex-wrap">
                {busy === c.id && <Loader2 size={12} className="animate-spin text-primary" />}
                {c.status !== 'REPLIED' && (
                  <button
                    onClick={() => setStatus(c.id, 'REPLIED')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg surface-low ghost-line text-xs font-medium hover:bg-green-50 hover:text-green-700 transition"
                  ><Check size={12} /> Mark replied</button>
                )}
                {c.status !== 'ARCHIVED' && (
                  <button
                    onClick={() => setStatus(c.id, 'ARCHIVED')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg surface-low ghost-line text-xs font-medium hover:bg-slate-50 hover:text-slate-700 transition"
                  ><Archive size={12} /> Archive</button>
                )}
                {c.status !== 'SPAM' && (
                  <button
                    onClick={() => setStatus(c.id, 'SPAM')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg surface-low ghost-line text-xs font-medium hover:bg-rose-50 hover:text-rose-700 transition"
                  ><ShieldAlert size={12} /> Mark spam</button>
                )}
              </footer>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function pillFor(s: string) {
  if (s === 'NEW')      return 'pill-new';
  if (s === 'REPLIED')  return 'pill-replied';
  if (s === 'ARCHIVED') return 'pill-archived';
  if (s === 'SPAM')     return 'pill-spam';
  return 'pill-archived';
}
