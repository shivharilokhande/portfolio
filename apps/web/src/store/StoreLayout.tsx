/**
 * StoreLayout — the wrapper for /store/* routes.
 *
 *   Glass-blur header (logo, nav back to portfolio, cart indicator, currency
 *   toggle). Outlet renders the active store page. Soft animated background
 *   so the store feels alive but lighter-touch than the portfolio cinema.
 */
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, IndianRupee, DollarSign } from 'lucide-react';
import { useCart } from './cartStore';
import { useEffect, useState } from 'react';
import Footer from '../sections/Footer';
import BrandLogo from '../components/BrandLogo';
import { warmApi } from '../lib/api';

export default function StoreLayout() {
  const count = useCart((s) => s.itemCount());
  const currency = useCart((s) => s.currency);
  const setCurrency = useCart((s) => s.setCurrency);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  // Wake the (free-tier, sleepy) backend as soon as any /store route mounts.
  useEffect(() => { warmApi(); }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Reset scroll on every route change inside the store (was previously firing
  // only on mount because the deps array was empty).
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);

  return (
    // flex-col so `main` grows to fill any remaining viewport space and the
    // Footer always sits flush against the bottom — no whitespace after it
    // when the catalog is short.
    <div className="relative min-h-screen surface text-ink overflow-x-hidden flex flex-col">
      {/* Soft animated backdrop — pinned to the VIEWPORT (not the outer div)
          so its blurred glow can't extend the scroll height. Inline styles
          override .aurora's default `position: absolute; inset: -30%` which
          was silently adding ~30% of viewport height below the container
          and creating the whitespace we saw after the Footer. */}
      <div
        aria-hidden
        className="aurora bg-[radial-gradient(circle_at_20%_20%,rgba(0,209,102,0.10),transparent_55%),radial-gradient(circle_at_80%_60%,rgba(10,92,207,0.08),transparent_55%)]"
        style={{ position: 'fixed', inset: 0 }}
      />

      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all ${
          scrolled ? 'glass ambient-float' : 'bg-transparent'
        }`}
      >
        <a href="#main" className="sr-only focus:not-sr-only fixed top-2 left-2 z-[60] glass px-3 py-1 rounded">Skip to content</a>

        <nav className="max-w-content mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 min-w-[44px] min-h-[44px] -ml-2 sm:ml-0 sm:min-w-0 text-sm text-muted hover:text-ink transition"
              aria-label="Back to portfolio"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Portfolio</span>
            </Link>
            <span className="h-5 w-px bg-outline-variant/30 hidden sm:block" />
            <Link to="/store" className="group flex items-center gap-2 min-w-0">
              {/* Wordmark text hidden on phones: badge + "store" tag + currency toggle + cart is all a 360px bar can hold. */}
              <BrandLogo className="hidden sm:inline-flex" />
              <span className="sm:hidden"><BrandLogo hideText /></span>
              <span className="ml-1 text-[10px] font-num uppercase tracking-[0.16em] text-primary px-1.5 py-0.5 rounded surface-low ghost-line">store</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-1 text-sm">
            <NavLink to="/store" end className={({ isActive }) =>
              `px-3 py-2 rounded-lg transition ${isActive ? 'text-ink bg-surface-low' : 'text-ink-soft hover:text-ink hover:bg-surface-low/70'}`
            }>Catalog</NavLink>
            <NavLink to="/store/cart" className={({ isActive }) =>
              `px-3 py-2 rounded-lg transition ${isActive ? 'text-ink bg-surface-low' : 'text-ink-soft hover:text-ink hover:bg-surface-low/70'}`
            }>Cart</NavLink>
            <a href="/#contact" className="px-3 py-2 rounded-lg text-ink-soft hover:text-ink hover:bg-surface-low/70 transition">
              Hire me
            </a>
          </div>

          <div className="flex items-center gap-2">
            {/* Currency toggle — surface-low pill, primary gradient on active */}
            <div className="flex items-center rounded-lg surface-low ghost-line p-0.5 text-xs shrink-0">
              <button
                aria-pressed={currency === 'INR'}
                onClick={() => setCurrency('INR')}
                className={`px-2 py-2 sm:py-1 rounded-md inline-flex items-center gap-1 transition ${
                  currency === 'INR' ? 'bg-gradient-to-br from-primary to-primary-soft text-on-primary' : 'text-ink-soft hover:text-ink'
                }`}
              >
                <IndianRupee size={11} /> INR
              </button>
              <button
                aria-pressed={currency === 'USD'}
                onClick={() => setCurrency('USD')}
                className={`px-2 py-2 sm:py-1 rounded-md inline-flex items-center gap-1 transition ${
                  currency === 'USD' ? 'bg-gradient-to-br from-primary to-primary-soft text-on-primary' : 'text-ink-soft hover:text-ink'
                }`}
              >
                <DollarSign size={11} /> USD
              </button>
            </div>

            <Link
              to="/store/cart"
              aria-label={`Cart, ${count} items`}
              className="relative w-11 h-11 grid place-items-center rounded-lg ghost-line hover:bg-surface-low/70 transition shrink-0"
            >
              <ShoppingBag size={16} />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold text-on-primary bg-gradient-to-br from-primary to-primary-soft grid place-items-center px-1">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </nav>
      </header>

      {/* flex-1 pushes the Footer to the bottom edge when the catalog is
          shorter than the viewport. Nothing renders inside the gap. */}
      <main id="main" className="relative z-10 pt-20 sm:pt-24 pb-16 flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
