import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, X, ShoppingBag, ArrowRight } from 'lucide-react';
import { formatMoney, useCart } from './cartStore';
import { usePageMeta } from '../hooks/usePageMeta';
import { SITE_NAME } from '../lib/site';

export default function CartPage() {
  const navigate = useNavigate();
  const lines       = useCart((s) => s.lines);
  const currency    = useCart((s) => s.currency);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove      = useCart((s) => s.remove);
  const clear       = useCart((s) => s.clear);
  const subtotal    = useCart((s) => s.subtotal());

  usePageMeta({ title: `Cart — ${SITE_NAME}`, canonicalPath: '/store/cart', noindex: true });

  if (lines.length === 0) {
    return (
      <div className="max-w-content mx-auto px-4 sm:px-6 py-12 text-center">
        <div className="tier-3 ambient-float-lg p-12 max-w-md mx-auto">
          <ShoppingBag size={36} className="mx-auto text-primary" />
          <h1 className="mt-5 font-display text-2xl tracking-tight">Your cart is empty</h1>
          <p className="mt-2 text-ink-soft">Browse the catalog to find a project that ships you forward.</p>
          <Link to="/store" className="btn-primary mt-6 mx-auto">
            Browse catalog <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-content mx-auto px-4 sm:px-6">
      <h1 className="font-display text-3xl sm:text-4xl tracking-tight">Your cart</h1>
      <p className="mt-2 text-ink-soft">{lines.length} product{lines.length > 1 ? 's' : ''} ready to ship to you.</p>

      <div className="mt-8 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {lines.map((l, idx) => {
              const unit = currency === 'INR' ? l.priceInr : l.priceUsd;
              const lineTotal = unit * l.quantity;
              return (
                <motion.li
                  key={l.productId}
                  layout
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  /* Phone: thumb + title on row one, qty / line total / remove
                     on a full-width row two. From sm everything sits on one row. */
                  className={`${idx % 2 === 0 ? 'tier-3' : 'tier-1'} ambient-float p-4 sm:p-5 flex flex-wrap sm:flex-nowrap gap-3 sm:gap-4 items-center`}
                >
                  <div
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl shrink-0 grid place-items-center font-display font-semibold text-2xl text-ink/40"
                    style={{ background: `radial-gradient(circle at 30% 30%, ${l.coverColor}99, transparent 70%)` }}
                  >
                    {l.title.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0 basis-[calc(100%-4.25rem)] sm:basis-auto">
                    <Link to={`/store/${l.slug}`} className="font-semibold text-ink hover:text-primary transition truncate block">
                      {l.title}
                    </Link>
                    <p className="text-xs text-ink-soft mt-0.5">Unit · {formatMoney(unit, currency)}</p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="flex items-center gap-1 surface-low ghost-line rounded-lg">
                    <button
                      aria-label="decrease"
                      onClick={() => setQuantity(l.productId, l.quantity - 1)}
                      className="w-10 h-10 grid place-items-center hover:bg-surface-container transition rounded-l-lg"
                    ><Minus size={13} /></button>
                    <span className="w-6 text-center text-sm font-num tabular-nums text-ink">{l.quantity}</span>
                    <button
                      aria-label="increase"
                      // Cap at 20 to match OrderRequest.OrderItemReq's
                      // @Max(20) on the API. Going higher client-side would
                      // just 400 at checkout with no UX explanation.
                      onClick={() => setQuantity(l.productId, Math.min(20, l.quantity + 1))}
                      disabled={l.quantity >= 20}
                      className="w-10 h-10 grid place-items-center hover:bg-surface-container transition rounded-r-lg disabled:opacity-40 disabled:cursor-not-allowed"
                    ><Plus size={13} /></button>
                  </div>
                  <div className="sm:w-24 text-right font-num text-sm text-ink">
                    {formatMoney(lineTotal, currency)}
                  </div>
                  <button
                    aria-label="remove"
                    onClick={() => remove(l.productId)}
                    className="w-10 h-10 grid place-items-center rounded-lg text-ink-soft hover:text-red-700 hover:bg-red-50 transition"
                  ><X size={15} /></button>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>

        {/* Kept outside the <ul> — a <button> may not be a direct child of a list. */}
        <button
          type="button"
          onClick={clear}
          className="mt-3 text-xs text-ink-soft hover:text-red-700 underline-offset-4 hover:underline"
        >Clear cart</button>
        </div>

        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-24 tier-3 ambient-float-lg p-6">
            <h2 className="font-display tracking-tight text-lg">Order summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-ink-soft"><dt>Subtotal</dt><dd className="font-num text-ink">{formatMoney(subtotal, currency)}</dd></div>
              <div className="flex justify-between text-ink-soft"><dt>Taxes</dt><dd>Calculated at checkout</dd></div>
              <div className="flex justify-between items-baseline pt-3 mt-3 surface-low rounded-xl px-3 py-3 -mx-3">
                <dt className="text-label-md text-ink-soft">Total</dt>
                <dd className="font-num font-semibold text-2xl text-gradient tracking-tight">{formatMoney(subtotal, currency)}</dd>
              </div>
            </dl>
            <button
              onClick={() => navigate('/store/checkout')}
              className="btn-primary mt-6 w-full justify-center text-base py-3"
            >
              Continue to checkout <ArrowRight size={16} />
            </button>
            <p className="mt-3 text-[11px] text-muted text-center">All purchases are digital · instant download.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
