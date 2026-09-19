/**
 * ProductPage — product detail.
 *   Big hero, tagline, price, "Add to cart" / "Buy now", features, what-you-get,
 *   tech stack, related products.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Check, FileDown, Tag, Sparkles, ArrowRight, ChevronRight,
} from 'lucide-react';
import { store, demoProduct, type ProductDto } from './storeApi';
import { useCart, formatMoney } from './cartStore';
import { onStoreChanged } from '../lib/portfolioBus';
import { assetUrl } from '../lib/api';
import { usePageMeta, breadcrumbLd, truncate, type PageMeta } from '../hooks/usePageMeta';
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_OWNER, absUrl } from '../lib/site';

/** Absolute image URLs for JSON-LD / og:image (API-relative → API origin, site-relative → site). */
function productImages(p: ProductDto): string[] {
  return (p.demoImages ?? [])
    .filter(Boolean)
    .map((u) => absUrl(assetUrl(u)));
}

function productMeta(slug: string | undefined, p: ProductDto | null | undefined): PageMeta {
  const path = `/store/${slug ?? ''}`;
  if (!p) {
    return {
      title: p === null ? `Product not found — ${SITE_NAME}` : `Store — ${SITE_NAME}`,
      canonicalPath: path,
      type: 'website',
      noindex: p === null,
    };
  }
  const images = productImages(p);
  const description = truncate(p.tagline || p.description, 155);
  const url = absUrl(`/store/${p.slug}`);
  return {
    title: `${p.title} — ₹${p.priceInr.toLocaleString('en-IN')} one-time | ${SITE_OWNER}`,
    description,
    canonicalPath: `/store/${p.slug}`,
    type: 'product',
    image: images[0],
    jsonLd: [
      {
        '@type': 'Product',
        name: p.title,
        description: p.description || p.tagline,
        sku: p.slug,
        category: p.category,
        brand: { '@type': 'Organization', name: SITE_NAME },
        image: images.length > 0 ? images : [DEFAULT_OG_IMAGE],
        url,
        offers: {
          '@type': 'Offer',
          price: p.priceInr,
          priceCurrency: 'INR',
          availability: 'https://schema.org/InStock',
          url,
          seller: { '@type': 'Person', name: SITE_OWNER },
        },
      },
      breadcrumbLd([
        { name: 'Home', path: '/' },
        { name: 'Store', path: '/store' },
        { name: p.title, path: `/store/${p.slug}` },
      ]),
    ],
  };
}

const POLL_MS = 30_000;

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  // Optimistic first paint: if the slug is in the bundled catalog, render it
  // immediately and swap in the API result when it arrives (the backend can
  // cold-start for ~50 s). `source` tracks whether `p` is cached or live.
  const [p, setP] = useState<ProductDto | null | undefined>(() => demoProduct(slug));
  const [source, setSource] = useState<'cached' | 'live'>('cached');
  const [pending, setPending] = useState(true);
  const currency = useCart((s) => s.currency);
  const add      = useCart((s) => s.add);

  const reqIdRef = useRef(0);
  const load = useCallback(async () => {
    if (!slug) { setP(null); setPending(false); return; }
    const myId = ++reqIdRef.current;
    setPending(true);
    try {
      const data = await store.one(slug);
      if (reqIdRef.current !== myId) return;
      // `null` here is a real 404 from the server — keep the not-found behaviour.
      setP(data);
      setSource('live');
    } catch (e) {
      if (reqIdRef.current !== myId) return;
      // 429 / 5xx / network → keep whatever is on screen (cached or live).
      // Only fall through to "Product not found" when there is nothing to show.
      console.warn('ProductPage load failed', e);
      setP((prev) => prev ?? demoProduct(slug) ?? null);
    } finally {
      if (reqIdRef.current === myId) setPending(false);
    }
  }, [slug]);

  // Initial load + reload whenever the slug changes. Reset to the cached entry
  // (or the skeleton) for the new slug first so a stale product never lingers.
  useEffect(() => {
    setP(demoProduct(slug));
    setSource('cached');
    load();
  }, [slug, load]);

  // Instant push from admin save (same browser).
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

  // Route meta + Product/Offer + BreadcrumbList JSON-LD. Called before the
  // early returns so the hook order is stable across loading / 404 / loaded.
  usePageMeta(productMeta(slug, p));

  if (p === undefined) {
    return (
      <div className="max-w-content mx-auto px-4 sm:px-6">
        <div
          role="status"
          aria-busy="true"
          aria-live="polite"
          className="h-80 shimmer rounded-3xl mt-6 grid place-items-center"
        >
          <span className="text-sm text-muted">Loading product…</span>
        </div>
      </div>
    );
  }
  if (p === null) {
    return (
      <div className="max-w-content mx-auto px-4 sm:px-6 text-center py-24">
        <h1 className="font-display text-3xl tracking-tight">Product not found</h1>
        <Link to="/store" className="btn-tertiary mt-5 mx-auto">
          Back to catalog <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  const price = currency === 'INR' ? p.priceInr : p.priceUsd;
  const addToCart = () => add(p);
  const buyNow = () => {
    // If the product is already in the cart, don't double-add — jumping
    // straight to checkout is enough. Previously clicking "Add" then
    // "Buy now" landed you at qty=2, which nobody expects.
    const alreadyCarted = useCart.getState().lines.some((l) => l.productId === p.id);
    if (!alreadyCarted) add(p);
    navigate('/store/checkout');
  };

  return (
    <div className="max-w-content mx-auto px-4 sm:px-6">
      {/* Breadcrumb — Home / Store / Product (mirrors the BreadcrumbList JSON-LD). */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
          <li><Link to="/" className="hover:text-ink transition">Home</Link></li>
          <li aria-hidden><ChevronRight size={12} className="text-muted" /></li>
          <li><Link to="/store" className="hover:text-ink transition">Store</Link></li>
          <li aria-hidden><ChevronRight size={12} className="text-muted" /></li>
          <li aria-current="page" className="text-ink truncate max-w-[60vw] sm:max-w-none">{p.title}</li>
        </ol>
      </nav>

      <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
        {/* LEFT — hero + visual */}
        <div className="lg:col-span-7">
          <ProductHero product={p} />

          {/* Features */}
          <section className="mt-10">
            <h2 className="font-display text-xl tracking-tight">What it does</h2>
            <p className="mt-3 text-ink-soft leading-relaxed">{p.description}</p>
            <ul className="mt-6 grid sm:grid-cols-2 gap-3">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2.5 text-sm">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-green-100 text-primary grid place-items-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span className="text-ink">{f}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* What you get */}
          <section className="mt-10">
            <h2 className="font-display text-xl tracking-tight">What you get</h2>
            <ul className="mt-4 space-y-2.5">
              {p.whatYouGet.map((w) => (
                <li key={w} className="flex gap-2.5 text-sm">
                  <FileDown size={14} className="mt-1 text-primary shrink-0" />
                  <span className="text-ink">{w}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Tech stack */}
          <section className="mt-10">
            <h2 className="font-display text-xl tracking-tight">Tech stack</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {p.techStack.map((t) => (
                <li key={t} className="chip-resource">{t}</li>
              ))}
            </ul>
          </section>
        </div>

        {/* RIGHT — sticky purchase panel */}
        <aside className="lg:col-span-5">
          <div className="lg:sticky lg:top-24 tier-3 ambient-float-lg p-7 sm:p-8">
            <p className="text-label-md text-primary">{p.category}</p>
            <h1 className="mt-3 font-display text-2xl sm:text-3xl tracking-tight leading-tight">{p.title}</h1>
            <p className="mt-3 text-ink-soft">{p.tagline}</p>

            <div className="mt-6 flex items-baseline gap-2 surface-low rounded-2xl p-4 -mx-1">
              <span className="font-num font-semibold text-4xl text-gradient tracking-tight">
                {formatMoney(price, currency)}
              </span>
              <span className="text-xs text-ink-soft">one-time · all updates included</span>
            </div>
            {pending && source === 'cached' && (
              <p className="mt-2 text-xs text-muted" role="status" aria-live="polite">
                Live price loading…
              </p>
            )}

            <div className="mt-6 grid gap-3">
              <button onClick={buyNow} className="btn-primary w-full justify-center text-base py-3">
                Buy now · checkout
              </button>
              <button
                onClick={addToCart}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg surface-low ghost-line text-ink font-semibold hover:bg-surface-container transition"
              >
                <ShoppingBag size={16} /> Add to cart
              </button>
            </div>

            <ul className="mt-6 space-y-2.5 text-xs text-ink-soft">
              <li className="flex items-center gap-2"><Check size={12} className="text-primary" /> Instant download after payment</li>
              <li className="flex items-center gap-2"><Check size={12} className="text-primary" /> Razorpay (UPI/cards) + Stripe accepted</li>
              <li className="flex items-center gap-2"><Check size={12} className="text-primary" /> Magic-link access — bookmark-friendly</li>
              <li className="flex items-center gap-2"><Check size={12} className="text-primary" /> {p.fileSizeMb} MB · v{p.version} · MIT-license-ready</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

/**
 * Product hero visual — real screenshot gallery when demo images exist,
 * otherwise the tinted monogram cover.
 */
function ProductHero({ product: p }: { product: ProductDto }) {
  const images = useMemo(() => p.demoImages ?? [], [p.demoImages]);
  const [active, setActive] = useState(0);

  // Reset selection when the product changes.
  useEffect(() => { setActive(0); }, [p.id]);

  const hasImages = images.length > 0;
  const current = hasImages ? images[Math.min(active, images.length - 1)] : null;

  return (
    <div>
      <motion.div
        initial={false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative aspect-[16/10] rounded-3xl overflow-hidden tier-3 ambient-float-lg"
        style={hasImages ? undefined : {
          background: `radial-gradient(120% 80% at 25% 25%, ${p.coverColor}66, transparent 70%), radial-gradient(120% 80% at 75% 85%, rgb(var(--primary-soft) / 0.30), transparent 70%)`,
        }}
      >
        {hasImages ? (
          <AnimatePresence mode="wait">
            <motion.img
              key={current}
              src={current ? assetUrl(current) : ''}
              alt={`${p.title} — screenshot ${active + 1}`}
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            />
          </AnimatePresence>
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <div className="font-display font-semibold text-9xl text-ink/15 select-none">
              {p.title.slice(0, 1)}
            </div>
          </div>
        )}
        <span className="absolute top-4 left-4 chip-resource z-10 backdrop-blur bg-white/70">
          <Tag size={10} /> {p.category}
        </span>
        {p.featured && (
          <span className="absolute top-4 right-4 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gradient-to-br from-primary to-primary-soft text-on-primary ambient-float z-10">
            <Sparkles size={10} /> Featured
          </span>
        )}
      </motion.div>

      {/* Thumbnail strip — only shows when there are 2+ images */}
      {images.length > 1 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show screenshot ${i + 1}`}
              className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden transition ${
                active === i
                  ? 'ring-2 ring-primary ambient-float'
                  : 'opacity-70 hover:opacity-100 ghost-line'
              }`}
            >
              <img src={assetUrl(url)} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
