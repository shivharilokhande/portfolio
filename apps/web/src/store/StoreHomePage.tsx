/**
 * StoreHomePage — catalog landing.
 *   Hero + filter chips + grid of ProductCards.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import ProductCard from './components/ProductCard';
import { store, demoProducts, type ProductDto } from './storeApi';
import { onStoreChanged } from '../lib/portfolioBus';
import { usePageMeta, breadcrumbLd } from '../hooks/usePageMeta';
import { SITE_OWNER, absUrl } from '../lib/site';

const HERO_COPY =
  'Production-grade source code for the systems I\'ve actually shipped — websites, ' +
  'backends, trading bots, business tools. Pay once, download instantly, ship faster.';

// Safety-net poll for cross-device sync (admin on laptop, catalog on phone).
// Same-browser edits arrive instantly via the BroadcastChannel push below.
const POLL_MS = 30_000;

export default function StoreHomePage() {
  // Optimistic first paint: render the bundled catalog instantly and swap in
  // the API response when it arrives (the backend can cold-start for ~50 s).
  const [items, setItems] = useState<ProductDto[]>(() => demoProducts());
  const [source, setSource] = useState<'cached' | 'live'>('cached');
  const [pending, setPending] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('All');

  const reqIdRef = useRef(0);
  const load = useCallback(async () => {
    const myId = ++reqIdRef.current;
    setPending(true);
    try {
      const data = await store.list();
      if (reqIdRef.current !== myId) return;
      setItems(data);
      setSource('live');
    } catch (e) {
      // 429 / 5xx / network — keep whatever we already have on screen (cached or live).
      if (reqIdRef.current !== myId) return;
      console.warn('StoreHomePage load failed', e);
    } finally {
      if (reqIdRef.current === myId) setPending(false);
    }
  }, []);

  // Initial load
  useEffect(() => { load(); }, [load]);

  // Instant push from any admin product save (same browser).
  useEffect(() => onStoreChanged(() => load()), [load]);

  // Cross-device safety net + refetch on tab focus.
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

  // Route meta + CollectionPage/ItemList/Breadcrumb JSON-LD (built from the loaded catalog).
  usePageMeta({
    title: `Store — ready-made software products by ${SITE_OWNER}`,
    description: HERO_COPY,
    canonicalPath: '/store',
    type: 'website',
    jsonLd: [
      {
        '@type': 'CollectionPage',
        name: 'Store',
        url: absUrl('/store'),
        description: HERO_COPY,
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: items.length,
          itemListElement: items.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: p.title,
            url: absUrl(`/store/${p.slug}`),
          })),
        },
      },
      breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Store', path: '/store' }]),
    ],
  });

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(items.map((p) => p.category)))],
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((p) => {
      if (category !== 'All' && p.category !== category) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [items, query, category]);

  return (
    <div className="max-w-content mx-auto px-4 sm:px-6">
      {/* Hero */}
      <section className="relative py-10 sm:py-16">
        <motion.span
          initial={false} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="chip-resource text-primary"
        >
          Digital products · instant delivery
        </motion.span>
        <motion.h1
          initial={false} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-6 font-display tracking-tight text-display-md max-w-4xl"
        >
          <span className="text-gradient">Buy the projects.</span><br />
          <span className="text-ink">Skip the rebuild.</span>
        </motion.h1>
        <motion.p
          initial={false} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2 }}
          className="mt-5 max-w-2xl text-ink-soft leading-relaxed"
        >
          {HERO_COPY}
        </motion.p>
      </section>

      {/* Filters — tonal sticky bar (no border) */}
      <section className="sticky top-16 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 glass">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted z-10" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, tags, tech…"
              className="input-clean pl-9 py-2.5"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`text-xs px-3 py-1.5 rounded-full transition ${
                  category === c
                    ? 'bg-gradient-to-br from-primary to-primary-soft text-on-primary ambient-float'
                    : 'chip-resource hover:bg-surface-container'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="py-10">
        {pending && source === 'cached' && (
          <p className="mb-4 text-xs text-muted" role="status" aria-live="polite">
            Live prices loading…
          </p>
        )}
        {filtered.length === 0 ? (
          <div className="tier-3 ambient-float p-10 text-center text-ink-soft">
            No products match this filter yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p, i) => <ProductCard key={p.id} p={p} idx={i} />)}
          </div>
        )}
      </section>
    </div>
  );
}
