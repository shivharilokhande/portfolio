import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, ExternalLink, Eye, Sparkles, Trash2, Plus, Pencil, AlertCircle,
  EyeOff, Search,
} from 'lucide-react';
import { adminApi, type AdminProduct } from './adminApi';

type FilterMode = 'ALL' | 'LIVE' | 'DRAFT' | 'FEATURED';
const FILTERS: FilterMode[] = ['ALL', 'LIVE', 'DRAFT', 'FEATURED'];

export default function AdminProductsPage() {
  const [items, setItems] = useState<AdminProduct[] | null>(null);
  const [err, setErr]     = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('ALL');

  const load = useCallback(async () => {
    try { setItems(await adminApi.products()); setErr(null); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Failed to load.'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function toggle(p: AdminProduct, field: 'featured' | 'published') {
    const next = !p[field];
    setItems((prev) => prev?.map((x) => x.id === p.id ? { ...x, [field]: next } : x) ?? null);
    try {
      await adminApi.updateProduct(p.id, { [field]: next });
      setErr(null);
    } catch (e) {
      // Surface the reason — silently reverting made "why did my toggle
      // flip back?" impossible to debug without opening devtools.
      setErr(e instanceof Error ? `Couldn't update ${p.title}: ${e.message}` : 'Update failed.');
      load();
    }
  }

  async function remove(p: AdminProduct) {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    setItems((prev) => prev?.filter((x) => x.id !== p.id) ?? null);
    try {
      await adminApi.deleteProduct(p.id);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? `Couldn't delete ${p.title}: ${e.message}` : 'Delete failed.');
      load();
    }
  }

  const filtered = useMemo(() => {
    if (!items) return null;
    const q = query.trim().toLowerCase();
    return items.filter((p) => {
      if (filter === 'LIVE'     && p.published === false) return false;
      if (filter === 'DRAFT'    && p.published !== false) return false;
      if (filter === 'FEATURED' && !p.featured)           return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.tagline?.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [items, query, filter]);

  const counts = useMemo(() => ({
    ALL:      items?.length ?? 0,
    LIVE:     items?.filter((p) => p.published !== false).length ?? 0,
    DRAFT:    items?.filter((p) => p.published === false).length ?? 0,
    FEATURED: items?.filter((p) => p.featured).length ?? 0,
  }), [items]);

  return (
    <div>
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <p className="text-label-md text-primary">catalog</p>
          <h1 className="mt-3 font-display text-3xl tracking-tight">Products</h1>
          <p className="mt-1 text-ink-soft text-sm">
            Edit details, upload source archives, toggle <Eye size={11} className="inline -mt-0.5" /> publish / <Sparkles size={11} className="inline -mt-0.5" /> featured.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-num text-muted">{filtered?.length ?? '–'} of {items?.length ?? '–'}</span>
          <Link to="/admin/products/new" className="btn-primary">
            <Plus size={14} /> New product
          </Link>
        </div>
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
            placeholder="Search title, slug, category, tag…"
            className="input-clean pl-9 py-2"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full transition ${
                filter === f
                  ? 'bg-gradient-to-br from-primary to-primary-soft text-on-primary ambient-float'
                  : 'chip-resource hover:bg-surface-container'
              }`}
            >
              {f} <span className="opacity-70 font-num">{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      {!items && !err && (
        <div className="mt-6 tier-3 ambient-float p-10 grid place-items-center text-ink-soft text-sm">
          <Loader2 size={18} className="animate-spin" />
        </div>
      )}

      {filtered && filtered.length === 0 && (
        <div className="mt-6 tier-3 ambient-float p-10 text-center text-ink-soft text-sm">
          {items && items.length === 0
            ? <>No products yet. Click <strong className="text-primary">New product</strong> to add your first one.</>
            : 'No products match this filter.'}
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <ul className="mt-6 space-y-3">
          {filtered.map((p, idx) => (
            <li key={p.id} className={`${idx % 2 === 0 ? 'tier-3' : 'tier-1'} ambient-float p-5 flex flex-wrap items-center gap-4`}>
              <div
                className="w-12 h-12 rounded-xl shrink-0 grid place-items-center font-display font-semibold text-ink/40"
                style={{ background: `radial-gradient(circle at 30% 30%, ${p.coverColor}99, transparent 70%)` }}
              >
                {p.title.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-[200px]">
                <p className="font-semibold text-ink truncate">{p.title}</p>
                <p className="text-[11px] text-ink-soft truncate font-num">{p.category} · v{p.version} · {p.fileSizeMb} MB · /{p.slug}</p>
              </div>
              <div className="hidden md:block text-right font-num text-sm text-ink-soft">
                ₹{p.priceInr.toLocaleString('en-IN')} · ${p.priceUsd}
              </div>

              {p.published !== false ? (
                <span className="pill pill-replied">live</span>
              ) : (
                <span className="pill pill-archived">draft</span>
              )}

              <button
                onClick={() => toggle(p, 'published')}
                className="p-2 rounded-lg surface-low ghost-line text-ink-soft hover:text-primary hover:bg-surface-container transition"
                title="Toggle published / hidden"
                aria-label="Toggle published"
              >
                {p.published === false ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>

              <button
                onClick={() => toggle(p, 'featured')}
                className={`p-2 rounded-lg transition ${
                  p.featured
                    ? 'bg-gradient-to-br from-primary to-primary-soft text-on-primary ambient-float'
                    : 'surface-low ghost-line text-ink-soft hover:bg-surface-container'
                }`}
                title={p.featured ? 'Featured' : 'Not featured'}
                aria-label="Toggle featured"
              >
                <Sparkles size={14} />
              </button>

              <Link
                to={`/admin/products/${p.id}/edit`}
                className="p-2 rounded-lg surface-low ghost-line text-primary hover:bg-surface-container transition"
                title="Edit"
                aria-label="Edit product"
              >
                <Pencil size={14} />
              </Link>

              <Link
                to={`/store/${p.slug}`}
                target="_blank"
                className="p-2 rounded-lg surface-low ghost-line text-ink-soft hover:bg-surface-container transition"
                title="Open in store"
                aria-label="Open in store"
              >
                <ExternalLink size={14} />
              </Link>

              <button
                onClick={() => remove(p)}
                className="p-2 rounded-lg surface-low ghost-line text-ink-soft hover:text-red-700 hover:bg-red-50 transition"
                title="Delete"
                aria-label="Delete"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
