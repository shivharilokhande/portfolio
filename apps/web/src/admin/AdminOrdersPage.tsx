import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2, AlertCircle, Check, X, RotateCcw, Search, RefreshCw,
} from 'lucide-react';
import { adminApi, type AdminOrder } from './adminApi';

type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
const STATUSES: ('ALL' | OrderStatus)[] = ['ALL', 'PENDING', 'PAID', 'CANCELLED', 'REFUNDED'];

/** New orders arrive without a push signal from the customer's browser, so the
 *  admin table auto-refreshes every 30s. Admin routes bypass the IP rate limiter. */
const POLL_MS = 30_000;

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [err, setErr]       = useState<string | null>(null);
  const [busy, setBusy]     = useState<number | null>(null);
  const [query, setQuery]   = useState('');
  const [filter, setFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const reqRef = useRef(0);

  const load = useCallback(async () => {
    const myId = ++reqRef.current;
    setRefreshing(true);
    try {
      const data = await adminApi.orders();
      if (reqRef.current !== myId) return;
      setOrders(data);
      setErr(null);
    } catch (e) {
      if (reqRef.current !== myId) return;
      setErr(e instanceof Error ? e.message : 'Failed to load orders.');
    } finally {
      if (reqRef.current === myId) setRefreshing(false);
    }
  }, []);

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

  async function setStatus(id: number, status: OrderStatus) {
    setBusy(id);
    setErr(null);
    setOrders((prev) => prev?.map((o) => o.id === id ? { ...o, status } : o) ?? null);
    try {
      await adminApi.updateOrderStatus(id, status);
    } catch (e) {
      // Silent rollback was masking real failures — surface the reason,
      // then re-load so the UI matches the server.
      setErr(e instanceof Error ? `Couldn't update order #${id}: ${e.message}` : `Couldn't update order #${id}.`);
      load();
    } finally { setBusy(null); }
  }

  const filtered = useMemo(() => {
    if (!orders) return null;
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter !== 'ALL' && o.status !== filter) return false;
      if (!q) return true;
      return (
        String(o.id).includes(q) ||
        o.paymentRef?.toLowerCase().includes(q) ||
        o.paymentMethod?.toLowerCase().includes(q) ||
        o.items.some((it) => it.title.toLowerCase().includes(q))
      );
    });
  }, [orders, query, filter]);

  const counts = useMemo(() => {
    const out: Record<string, number> = { ALL: orders?.length ?? 0 };
    for (const s of orders ?? []) out[s.status] = (out[s.status] ?? 0) + 1;
    return out;
  }, [orders]);

  return (
    <div>
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-label-md text-primary">store</p>
          <h1 className="mt-3 font-display text-3xl tracking-tight">Orders</h1>
          <p className="mt-1 text-ink-soft text-sm">Mark orders as paid, cancelled, or refunded · auto-refreshes every 30s.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-num text-muted">{filtered?.length ?? '–'} of {orders?.length ?? '–'}</span>
          <button
            onClick={load}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg surface-low ghost-line text-sm text-ink-soft hover:text-ink transition disabled:opacity-50"
            aria-label="Refresh orders"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {err && (
        <p className="mt-6 inline-flex items-center gap-1.5 text-sm text-red-700">
          <AlertCircle size={14} /> {err}
        </p>
      )}

      {/* Filter bar — search + status pills */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted z-10" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search order #, item, payment ref…"
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

      {!orders && !err && (
        <div className="mt-6 tier-3 ambient-float p-10 grid place-items-center text-ink-soft text-sm">
          <Loader2 size={18} className="animate-spin" />
        </div>
      )}

      {filtered && filtered.length === 0 && (
        <div className="mt-6 tier-3 ambient-float p-10 text-center text-ink-soft text-sm">
          {orders && orders.length === 0
            ? 'No orders yet. They’ll show up here as soon as someone buys.'
            : 'No orders match this filter.'}
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <div className="mt-6 tier-3 ambient-float overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] font-num uppercase tracking-wider text-muted surface-low">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Payment ref</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    className="hover:bg-surface-low/60 transition"
                  >
                    <td className="px-4 py-3 font-num text-ink">{o.id}</td>
                    <td className="px-4 py-3"><span className={`pill ${pillFor(o.status)}`}>{o.status}</span></td>
                    <td className="px-4 py-3 text-ink-soft">
                      <ul className="space-y-0.5">
                        {o.items.map((it, idx) => (
                          <li key={idx} className="truncate">{it.title}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-3 text-right font-num text-ink">
                      {o.currency === 'INR' ? '₹' : '$'}{Number(o.total).toFixed(0)}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{o.paymentMethod}</td>
                    <td className="px-4 py-3 text-[11px] text-muted truncate max-w-[180px] font-mono">{o.paymentRef}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {busy === o.id && <Loader2 size={12} className="animate-spin text-primary" />}
                        {o.status !== 'PAID' && (
                          <button
                            onClick={() => setStatus(o.id, 'PAID')}
                            className="p-1.5 rounded-lg surface-low ghost-line hover:bg-green-50 hover:text-green-700 transition"
                            title="Mark paid" aria-label="Mark paid"
                          ><Check size={12} /></button>
                        )}
                        {o.status !== 'CANCELLED' && (
                          <button
                            onClick={() => setStatus(o.id, 'CANCELLED')}
                            className="p-1.5 rounded-lg surface-low ghost-line hover:bg-rose-50 hover:text-rose-700 transition"
                            title="Cancel" aria-label="Cancel"
                          ><X size={12} /></button>
                        )}
                        {o.status === 'PAID' && (
                          <button
                            onClick={() => setStatus(o.id, 'REFUNDED')}
                            className="p-1.5 rounded-lg surface-low ghost-line hover:bg-amber-50 hover:text-amber-700 transition"
                            title="Refund" aria-label="Refund"
                          ><RotateCcw size={12} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function pillFor(s: string) {
  if (s === 'PAID')      return 'pill-paid';
  if (s === 'PENDING')   return 'pill-pending';
  if (s === 'CANCELLED') return 'pill-cancelled';
  if (s === 'REFUNDED')  return 'pill-refunded';
  return 'pill-archived';
}
