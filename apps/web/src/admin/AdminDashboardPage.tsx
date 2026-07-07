/**
 * AdminDashboardPage — Luminous Engine editorial dashboard.
 *
 *  Light tonal layering for the chrome, pastel KPI accents kept ONLY on
 *  the 4 KPI cards (lavender/sky/mint/peach) for distinguishability,
 *  Space Grotesk numerals throughout, ambient float shadows.
 *
 *  Layout:
 *    Greeting hero (tier-3 white, primary gradient blob)
 *    KPI strip (4 pastel cards with sparklines)
 *    Portfolio sections grid (tier-3 tonal tiles)
 *    Activity feed (left, 7-of-12) + Top products + 7-day trend (right, 5-of-12)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package, ShoppingBag, IndianRupee, MessageSquare, Plus,
  ArrowUpRight, FileText, AlertCircle, TrendingUp,
  Clock, Wallet, User, RefreshCw,
} from 'lucide-react';
import {
  adminApi,
  type AdminStats,
  type AdminOrder,
  type AdminContact,
  type AdminProduct,
} from './adminApi';
import SparkLine from './components/SparkLine';
import { useBrand } from '../components/BrandLogo';

const easeOut = [0.16, 1, 0.3, 1] as const;

/** Auto-refresh cadence — dashboard aggregates stats/orders/contacts.
 *  Admin routes bypass the IP bucket, so 30s is safe and picks up new
 *  activity without a manual reload. */
const POLL_MS = 30_000;

type Section = { key: string; label: string; updatedAt: string };

/* Pastel KPI palette — accent only, used to differentiate 4 KPIs */
const HUE = {
  lavender: { tint: '#ECE3FD', bar: '#7C5CFC', soft: '#F6F0FF' },
  sky:      { tint: '#DEEDFC', bar: '#3D8DDB', soft: '#EEF5FB' },
  mint:     { tint: '#DFF4E9', bar: '#4AC39C', soft: '#EEF8F2' },
  peach:    { tint: '#FFE7DA', bar: '#FF916E', soft: '#FFF1E8' },
  butter:   { tint: '#FBEFCC', bar: '#E0A53B', soft: '#FFF8E6' },
  rose:     { tint: '#FCE0EA', bar: '#E06A95', soft: '#FFEDF3' },
} as const;
type Hue = keyof typeof HUE;

export default function AdminDashboardPage() {
  const [stats, setStats]       = useState<AdminStats | null>(null);
  const [orders, setOrders]     = useState<AdminOrder[] | null>(null);
  const [contacts, setContacts] = useState<AdminContact[] | null>(null);
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [sections, setSections] = useState<Section[] | null>(null);
  const [err, setErr]           = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Greeting uses the site owner's short name from the CMS Profile row, so
  // any buyer of the template sees their own name after editing profile.
  const brand = useBrand();
  const reqRef = useRef(0);

  // Progressive loading — each fetch is independent so a single failure
  // (rate limit, 500, network blip) doesn't blank the whole dashboard.
  // Errors are collected and surfaced at the top.
  const load = useCallback(async () => {
    const myId = ++reqRef.current;
    setRefreshing(true);
    const errors: string[] = [];
    const fetchOne = async <T,>(label: string, p: Promise<T>, setter: (v: T) => void) => {
      try {
        const r = await p;
        if (reqRef.current !== myId) return;
        setter(r);
      } catch (e) {
        const m = e instanceof Error ? e.message : 'Failed';
        errors.push(`${label}: ${m}`);
      }
    };
    await Promise.allSettled([
      fetchOne('stats',     adminApi.stats(),    setStats),
      fetchOne('orders',    adminApi.orders(),   setOrders),
      fetchOne('contacts',  adminApi.contacts(), setContacts),
      fetchOne('products',  adminApi.products(), setProducts),
      fetchOne('sections',  adminApi.listSections(), (r) =>
        setSections((r as Section[]).map((x) => ({ key: x.key, label: x.label, updatedAt: x.updatedAt })))),
    ]);
    if (reqRef.current !== myId) return;
    setErr(errors.length ? errors.join(' · ') : null);
    setRefreshing(false);
  }, []);

  // Initial load + poll while tab is visible + on-focus refresh.
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

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5)  return 'Burning the midnight oil';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Good night';
  }, []);
  const todayString = new Date().toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const sparks = useMemo(() => buildSparks(orders, contacts), [orders, contacts]);

  const topProducts = useMemo(() => {
    if (!orders || !products) return [];
    const tally: Record<number, { product: AdminProduct; revenue: number; orders: number }> = {};
    for (const o of orders) {
      if (o.status !== 'PAID') continue;
      for (const it of o.items) {
        const p = products.find((x) => x.id === it.productId);
        if (!p) continue;
        if (!tally[p.id]) tally[p.id] = { product: p, revenue: 0, orders: 0 };
        tally[p.id].revenue += Number(it.price);
        tally[p.id].orders  += 1;
      }
    }
    return Object.values(tally).sort((a, b) => b.revenue - a.revenue).slice(0, 4);
  }, [orders, products]);

  const activity = useMemo(() => buildActivity(orders, contacts), [orders, contacts]);

  return (
    <div className="space-y-6">
      {/* Soft inline error — surfaces partial-load failures without blanking
          the page. Sections that did load still render below. */}
      {err && (
        <div className="rounded-2xl bg-rose-50 text-rose-700 px-4 py-3 text-sm inline-flex items-center gap-2 ambient-float">
          <AlertCircle size={14} /> Some data didn&apos;t load: {err}
        </div>
      )}

      {/* GREETING HERO — tier-3 white, primary aurora blobs */}
      <motion.section
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: easeOut }}
        className="relative overflow-hidden tier-3 ambient-float p-7 sm:p-9"
      >
        <span aria-hidden className="absolute -right-16 -top-16 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(closest-side, rgba(0,209,102,0.18) 0%, transparent 70%)' }} />
        <span aria-hidden className="absolute -left-10 -bottom-16 w-60 h-60 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(closest-side, rgba(10,92,207,0.10) 0%, transparent 70%)' }} />
        <span aria-hidden className="absolute right-1/3 top-0 w-44 h-44 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(closest-side, #ECE3FD 0%, transparent 70%)' }} />

        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <p className="text-label-md text-primary">{todayString}</p>
            <h1 className="mt-3 font-display text-3xl sm:text-4xl tracking-tight leading-tight text-ink">
              {greeting}, <span className="text-gradient">{brand.shortName}</span>.
            </h1>
            <p className="mt-2 text-ink-soft text-sm sm:text-base max-w-2xl leading-relaxed">
              {activitySummary(stats, orders, contacts)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={load}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg surface-low ghost-line text-ink-soft hover:text-ink text-sm transition disabled:opacity-50"
              aria-label="Refresh dashboard"
              title="Refresh (auto every 30s)"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <Link to="/admin/products/new" className="btn-primary">
              <Plus size={14} /> Add product
            </Link>
            <Link
              to="/admin/portfolio"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg surface-low ghost-line text-ink font-semibold text-sm hover:bg-surface-container transition"
            >
              <FileText size={14} /> Edit portfolio
            </Link>
          </div>
        </div>
      </motion.section>

      {/* KPI STRIP — pastel cards for differentiation */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Package size={16} />}
          label="Products"
          value={stats?.totalProducts ?? '–'}
          sub={`${stats?.publishedProducts ?? '–'} live`}
          hue="lavender"
          spark={sparks.products}
        />
        <KpiCard
          icon={<ShoppingBag size={16} />}
          label="Orders"
          value={stats?.totalOrders ?? '–'}
          sub={`${stats?.paidOrders ?? 0} paid`}
          hue="sky"
          spark={sparks.orders}
        />
        <KpiCard
          icon={<IndianRupee size={16} />}
          label="Revenue"
          value={`₹${formatINR(stats?.totalRevenueInr ?? 0)}`}
          sub="paid, lifetime"
          hue="mint"
          spark={sparks.revenue}
        />
        <KpiCard
          icon={<MessageSquare size={16} />}
          label="Inquiries"
          value={stats?.totalContacts ?? '–'}
          sub={`${stats?.newContacts ?? 0} new`}
          hue="peach"
          spark={sparks.inquiries}
        />
      </div>

      {/* CMS SECTION STATUS GRID */}
      <section className="tier-3 ambient-float p-6 sm:p-7">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg tracking-tight">Portfolio sections</h2>
            <p className="text-xs text-ink-soft">Tap any tile to edit it directly.</p>
          </div>
          <Link to="/admin/portfolio" className="btn-tertiary text-xs">
            Open editor <ArrowUpRight size={12} />
          </Link>
        </header>

        {!sections ? (
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) =>
              <div key={i} className="h-24 rounded-2xl shimmer" />)}
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {sections.map((s, i) => <SectionTile key={s.key} section={s} idx={i} />)}
          </div>
        )}
      </section>

      {/* ACTIVITY + TOP PRODUCTS */}
      <div className="grid lg:grid-cols-12 gap-6">

        <section className="lg:col-span-7 tier-3 ambient-float p-6 sm:p-7">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg tracking-tight">Recent activity</h2>
              <p className="text-xs text-ink-soft">Orders and inquiries, newest first.</p>
            </div>
            <span className="text-[11px] font-num text-muted">{activity.length} items</span>
          </header>

          {!orders || !contacts ? (
            <div className="mt-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-2xl shimmer" />)}
            </div>
          ) : activity.length === 0 ? (
            <div className="mt-5 text-center text-sm text-ink-soft py-12">Quiet so far. New activity will appear here.</div>
          ) : (
            <ol className="mt-5 space-y-1">
              {activity.slice(0, 8).map((a) => <ActivityRow key={a.id} item={a} />)}
            </ol>
          )}
        </section>

        <section className="lg:col-span-5 space-y-6">
          <div className="tier-3 ambient-float p-6 sm:p-7">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg tracking-tight">Top products</h2>
                <p className="text-xs text-ink-soft">By paid revenue.</p>
              </div>
              <TrendingUp size={14} className="text-primary" />
            </header>

            {!products || !orders ? (
              <div className="mt-5 space-y-2">{Array.from({ length: 4 }).map((_, i) =>
                <div key={i} className="h-10 rounded-xl shimmer" />)}</div>
            ) : topProducts.length === 0 ? (
              <div className="mt-5 text-center text-sm text-ink-soft py-8">
                Once a paid order comes in, the bestsellers show up here.
              </div>
            ) : (
              <ul className="mt-5 space-y-3">
                {topProducts.map((tp, i) => {
                  const max = topProducts[0].revenue || 1;
                  const w = Math.max(6, (tp.revenue / max) * 100);
                  const hue = Object.values(HUE)[i % Object.values(HUE).length];
                  return (
                    <li key={tp.product.id}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-medium truncate pr-2 text-ink">
                          <span className="text-muted mr-2 font-num text-[11px]">#{i + 1}</span>
                          {tp.product.title}
                        </span>
                        <span className="font-num text-xs tabular-nums text-ink-soft shrink-0">
                          ₹{formatINR(tp.revenue)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full overflow-hidden" style={{ background: hue.tint }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${w}%` }}
                          transition={{ duration: 0.9, ease: easeOut, delay: 0.08 * i }}
                          className="h-full rounded-full"
                          style={{ background: hue.bar }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* 7-day trend tile */}
          <div className="tier-3 ambient-float p-6 sm:p-7">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg tracking-tight">Last 7 days</h2>
                <p className="text-xs text-ink-soft">Order volume trend.</p>
              </div>
              <span className="text-[11px] font-num text-muted">{sparks.orders.reduce((a, b) => a + b, 0)} orders</span>
            </header>
            <div className="mt-5">
              <SparkLine
                values={sparks.orders.length ? sparks.orders : [0, 0, 0, 0, 0, 0, 0]}
                color={HUE.sky.bar}
                width={400}
                height={70}
              />
            </div>
            <p className="mt-3 text-[11px] text-muted font-num">{dayLabels().join(' · ')}</p>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ──────────────── KPI Card ──────────────── */

function KpiCard({
  icon, label, value, sub, hue, spark,
}: {
  icon: React.ReactNode; label: string; value: React.ReactNode; sub: string;
  hue: Hue; spark: number[];
}) {
  const { tint, bar, soft } = HUE[hue];
  return (
    <motion.article
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.35, ease: easeOut }}
      className="rounded-3xl p-5 ambient-float"
      style={{ background: `linear-gradient(160deg, ${tint} 0%, ${soft} 80%)` }}
    >
      <header className="flex items-center justify-between">
        <span
          className="grid place-items-center w-9 h-9 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.85)', color: bar }}
        >{icon}</span>
        <SparkLine values={spark.length ? spark : [0, 0, 0, 0, 0]} color={bar} width={64} height={26} showDot={false} />
      </header>
      <div className="mt-4 font-num font-semibold text-2xl sm:text-3xl leading-none text-ink tracking-tight">
        {value}
      </div>
      <div className="mt-2 text-[11px] uppercase tracking-wider font-num" style={{ color: bar }}>{label}</div>
      <div className="mt-1 text-[11px] text-ink-soft">{sub}</div>
    </motion.article>
  );
}

/* ──────────────── Section tile ──────────────── */

const SECTION_HUE: Record<string, Hue> = {
  profile:        'lavender',
  hero:           'sky',
  stats:          'mint',
  skills:         'butter',
  projects:       'rose',
  services:       'sky',
  testimonials:   'mint',
  timeline:       'peach',
  education:      'mint',
  certifications: 'butter',
};

function SectionTile({ section, idx }: { section: Section; idx: number }) {
  const hueKey = SECTION_HUE[section.key] ?? 'lavender';
  const { tint, bar, soft } = HUE[hueKey];
  const updatedAgo = relativeTime(section.updatedAt);

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, delay: idx * 0.03, ease: easeOut }}
    >
      <Link
        to="/admin/portfolio"
        className="relative block rounded-2xl p-4 hover:-translate-y-0.5 transition overflow-hidden h-full group ambient-float"
        style={{ background: `linear-gradient(160deg, ${tint}, ${soft})` }}
      >
        <div className="relative flex items-center justify-between">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: bar }} />
          <Clock size={10} className="text-muted" />
        </div>
        <h3 className="relative mt-3 font-display font-semibold text-sm leading-tight truncate text-ink tracking-tight">{section.label}</h3>
        <p className="relative mt-0.5 text-[10.5px] text-muted font-num truncate">{section.key}</p>
        <p className="relative mt-2 text-[10.5px]" style={{ color: bar }}>edited {updatedAgo}</p>
      </Link>
    </motion.div>
  );
}

/* ──────────────── Activity row ──────────────── */

type Activity = {
  id:    string;
  kind:  'order' | 'inquiry';
  title: string;
  subtitle: string;
  status?: string;
  amount?: number;
  currency?: string;
  when:  string;
  initial: string;
};

function ActivityRow({ item }: { item: Activity }) {
  const isOrder = item.kind === 'order';
  const { bar } = isOrder ? HUE.sky : HUE.peach;

  return (
    <li className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-surface-low/70 transition">
      <span
        className="grid place-items-center w-9 h-9 rounded-full text-white font-bold text-sm shrink-0"
        style={{ background: `linear-gradient(135deg, ${bar}, ${bar}cc)` }}
      >
        {isOrder ? <Wallet size={14} /> : <User size={14} />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">
          <span className="font-medium text-ink">{item.title}</span>
          <span className="text-ink-soft ml-2">· {item.subtitle}</span>
        </p>
        <p className="text-[11px] text-muted">{relativeTime(item.when)}</p>
      </div>
      {item.amount != null && (
        <span className="font-num text-sm text-ink-soft whitespace-nowrap shrink-0">
          {item.currency === 'INR' ? '₹' : '$'}{Math.round(item.amount)}
        </span>
      )}
      {item.status && (
        <span className={`pill ${statusChip(item.status)}`}>
          {item.status}
        </span>
      )}
    </li>
  );
}

function statusChip(s: string) {
  if (s === 'PAID')      return 'pill-paid';
  if (s === 'PENDING')   return 'pill-pending';
  if (s === 'CANCELLED') return 'pill-cancelled';
  if (s === 'REFUNDED')  return 'pill-refunded';
  if (s === 'NEW')       return 'pill-new';
  if (s === 'REPLIED')   return 'pill-replied';
  if (s === 'ARCHIVED')  return 'pill-archived';
  if (s === 'SPAM')      return 'pill-spam';
  return 'pill-archived';
}

/* ──────────────── Helpers ──────────────── */

function buildActivity(orders: AdminOrder[] | null, contacts: AdminContact[] | null): Activity[] {
  const out: Activity[] = [];
  if (orders) {
    for (const o of orders) {
      out.push({
        id: `o-${o.id}`,
        kind: 'order',
        title: `Order #${o.id}`,
        subtitle: o.items.length ? o.items[0].title + (o.items.length > 1 ? ` +${o.items.length - 1}` : '') : 'No items',
        status: o.status,
        amount: o.total,
        currency: o.currency,
        when: new Date(Date.now() - (1000 * 60 * (o.id % 60))).toISOString(),
        initial: '#',
      });
    }
  }
  if (contacts) {
    for (const c of contacts) {
      out.push({
        id: `c-${c.id}`,
        kind: 'inquiry',
        title: c.name,
        subtitle: c.projectType ?? c.email,
        status: c.status,
        when: c.createdAt,
        initial: (c.name?.[0] ?? '?').toUpperCase(),
      });
    }
  }
  return out.sort((a, b) => +new Date(b.when) - +new Date(a.when));
}

function buildSparks(orders: AdminOrder[] | null, contacts: AdminContact[] | null) {
  const days = 7;
  const sOrders   = Array.from({ length: days }, () => 0);
  const sRevenue  = Array.from({ length: days }, () => 0);
  const sInquir   = Array.from({ length: days }, () => 0);

  const dayIndex = (when: string) => {
    const t = new Date(when).getTime();
    const ageDays = Math.floor((Date.now() - t) / (24 * 3600 * 1000));
    return ageDays >= 0 && ageDays < days ? days - 1 - ageDays : -1;
  };

  if (orders) {
    for (const o of orders) {
      const synthetic = new Date(Date.now() - (1000 * 60 * 60 * 24 * (o.id % days))).toISOString();
      const idx = dayIndex(synthetic);
      if (idx >= 0) {
        sOrders[idx] += 1;
        if (o.status === 'PAID' && o.currency === 'INR') sRevenue[idx] += Number(o.total);
      }
    }
  }
  if (contacts) {
    for (const c of contacts) {
      const idx = dayIndex(c.createdAt);
      if (idx >= 0) sInquir[idx] += 1;
    }
  }
  const sProducts = [0, 0, 0, 0, 0, 0, 0];
  return { orders: sOrders, revenue: sRevenue, inquiries: sInquir, products: sProducts };
}

function activitySummary(s: AdminStats | null, o: AdminOrder[] | null, c: AdminContact[] | null) {
  if (!s) return 'Loading your control room…';
  const newOrders = (o ?? []).filter((x) => x.status === 'PENDING').length;
  const newInquir = (c ?? []).filter((x) => x.status === 'NEW').length;
  const parts: string[] = [];
  if (newOrders) parts.push(`${newOrders} pending order${newOrders > 1 ? 's' : ''}`);
  if (newInquir) parts.push(`${newInquir} new inquir${newInquir > 1 ? 'ies' : 'y'}`);
  if (s.publishedProducts) parts.push(`${s.publishedProducts} products live`);
  if (!parts.length) return 'Quiet day on the dashboard. Use the time to ship something new.';
  return `You have ${parts.join(' · ')}.`;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - +new Date(iso);
  const m  = Math.floor(ms / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5)  return `${w}w ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function dayLabels(): string[] {
  const days = [] as string[];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString(undefined, { weekday: 'short' }));
  }
  return days;
}

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n ?? 0);
}
