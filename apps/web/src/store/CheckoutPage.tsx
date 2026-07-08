/**
 * CheckoutPage — guest checkout.
 *   Email + name + payment method, then "Pay now" hits the backend.
 *   - Stripe → redirect to Session.url returned by the server.
 *   - Razorpay → open Checkout.js modal with the razorpay order id.
 *   - Mock → hits /orders/{id}/confirm to simulate a paid transaction.
 *
 *   Real payment success is finalised server-side via the webhook. This
 *   page just navigates to the success page — the DownloadsPage waits
 *   for the token to appear once the webhook marks the order PAID.
 */
declare global {
  interface Window { Razorpay?: new (opts: unknown) => { open: () => void } }
}

/** Lazy-load Razorpay Checkout.js on demand — 30 KB script, only needed
 *  when the buyer actually picks Razorpay. */
async function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload  = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Razorpay Checkout.js'));
    document.head.appendChild(s);
  });
}

async function openRazorpayCheckout(opts: {
  keyId:       string;
  orderId:     string;
  amountMinor: number;
  currency:    string;
  name:        string;
  email:       string;
  /** Buyer's phone in E.164-ish form ("+91XXXXXXXXXX"). Passed to Razorpay's
   *  prefill so the modal doesn't reuse whatever number the buyer's browser
   *  cached from a previous session, and so our merchant-side confirmation
   *  email shows the number the buyer just entered. Optional — Razorpay
   *  will ask if it's missing. */
  contact?:    string;
  onSuccess: () => void;
  onFailure: (msg: string) => void;
}) {
  try {
    await loadRazorpayScript();
    if (!window.Razorpay) throw new Error('Razorpay SDK failed to load');
    const prefill: Record<string, string> = { name: opts.name, email: opts.email };
    if (opts.contact && opts.contact.trim()) prefill.contact = opts.contact.trim();
    const rzp = new window.Razorpay({
      key:         opts.keyId,
      order_id:    opts.orderId,
      amount:      opts.amountMinor,
      currency:    opts.currency,
      name:        'Portfolio Store',
      description: 'Digital product purchase',
      prefill,
      // Stop Razorpay from surfacing a "Save details for next time?" prompt
      // — the merchant confirmation email should always show the number the
      // buyer entered on THIS purchase, not something saved in a cookie.
      remember_customer: false,
      // handler fires client-side on payment success. Server webhook is
      // the authoritative payment record — the handler just moves the
      // user to the success page. If webhook is delayed, the success
      // page polls the order until the token arrives.
      handler: () => opts.onSuccess(),
      modal: {
        ondismiss: () => opts.onFailure('Payment cancelled. Nothing was charged.'),
      },
      theme: { color: '#00d166' },
    });
    rzp.open();
  } catch (e) {
    opts.onFailure(e instanceof Error ? e.message : 'Razorpay checkout failed to open.');
  }
}
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, ArrowLeft, IndianRupee, CreditCard, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCart, formatMoney } from './cartStore';
import { store } from './storeApi';

type PayMethod = 'razorpay' | 'stripe';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const lines       = useCart((s) => s.lines);
  const currency    = useCart((s) => s.currency);
  const subtotal    = useCart((s) => s.subtotal());
  const clear       = useCart((s) => s.clear);

  const [email, setEmail] = useState('');
  const [name,  setName]  = useState('');
  const [phone, setPhone] = useState('');
  // Razorpay is the default because most launch traffic is India-based (INR).
  // Buyers in USD/EUR flip to Stripe via the picker below.
  const [method, setMethod] = useState<PayMethod>('razorpay');
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState<string | null>(null);

  if (lines.length === 0) {
    return (
      <div className="max-w-content mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="font-display text-2xl tracking-tight">Your cart is empty.</h1>
        <Link to="/store" className="text-primary underline mt-3 inline-block">Browse catalog</Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!email || !name) { setErr('Name and email are required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('That email looks malformed.'); return; }
    // Phone is required so the merchant confirmation and any Razorpay-side
    // OTP/SMS goes to a number the buyer explicitly gave us — not something
    // cached in their browser from a prior session. Accept 10-15 digits with
    // an optional leading + / country code; Indian mobile stays 10 digits.
    const phoneDigits = phone.replace(/[^\d]/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      setErr('Please enter a valid mobile number (10 digits for India, or with country code).');
      return;
    }

    setBusy(true);
    try {
      const order = await store.createOrder({
        email, name, currency, paymentMethod: method,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      });

      // Stripe → hosted checkout redirect.
      if (order.paymentRedirectUrl) {
        window.location.href = order.paymentRedirectUrl;
        return;
      }

      // Razorpay → open inline Checkout.js modal. The webhook back on the
      // server will mark the order PAID; we just navigate the user to the
      // success page which polls for the download token.
      if (method === 'razorpay' && order.razorpayKeyId && order.paymentRef) {
        // Normalise the phone to E.164 for Razorpay: if the buyer typed 10
        // bare digits, assume India (+91). Anything else with a country
        // code / + prefix is passed through as-is.
        const contact = phoneDigits.length === 10 ? '+91' + phoneDigits : '+' + phoneDigits;
        await openRazorpayCheckout({
          keyId:       order.razorpayKeyId,
          orderId:     order.paymentRef,   // razorpay order id
          amountMinor: Math.round(order.total * 100),
          currency:    order.currency,
          name,
          email,
          contact,
          onSuccess: () => {
            clear();
            // Pass the buyer's email through so the success page can poll
            // /api/store/orders/{id}?email=... — that endpoint proves
            // ownership by email match and returns the download token once
            // the webhook mints it, so we can reveal the "Open downloads"
            // button in-page instead of forcing the buyer to wait for the
            // email round-trip.
            navigate(`/store/success/${order.id}?email=${encodeURIComponent(email)}`);
          },
          onFailure: (msg) => setErr(msg),
        });
        return;
      }

      // Fell through both provider paths — means the gateway didn't return
      // the expected fields (no razorpayKeyId, no Stripe redirect URL).
      // Usually means the admin hasn't pasted live keys yet, or testMode
      // is still on in /admin/settings. Show a clear message instead of
      // leaving the buyer with a silent stall.
      setErr(
        `Payment gateway (${method}) isn't configured. Please try again in a few minutes, or contact ${
          import.meta.env.VITE_SUPPORT_EMAIL || 'support'
        } if this keeps happening.`,
      );
    } catch (e) {
      // Do NOT fabricate a fake success on network errors. The old path
      // navigated buyers to /store/success/{fakeId} with a synthesised
      // token; when the API later came back up they'd land on a "Link not
      // valid" error page which is confusing UX. Cleaner: surface the
      // connection error and keep the cart intact so they can retry.
      const status = (e as { status?: number })?.status;
      const isNetwork = status === undefined && e instanceof TypeError;
      const base = isNetwork
        ? 'Couldn\'t reach the payment server.'
        : e instanceof Error ? e.message : 'Checkout failed.';
      setErr(
        base +
          (status ? ` (${status})` : '') +
          ' — nothing was charged, your cart is safe, please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-content mx-auto px-4 sm:px-6">
      <Link to="/store/cart" className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink mb-6">
        <ArrowLeft size={13} /> Back to cart
      </Link>

      <div className="grid lg:grid-cols-12 gap-8">
        <form onSubmit={onSubmit} className="lg:col-span-7 tier-3 ambient-float-lg p-7 sm:p-9 space-y-6">
          <header>
            <h1 className="font-display text-2xl sm:text-3xl tracking-tight">Checkout</h1>
            <p className="mt-1 text-ink-soft text-sm">Guest checkout · we&apos;ll email you a magic link to your downloads.</p>
          </header>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold mb-1 text-ink">Your details</legend>
            <Field label="Full name" name="name" value={name} setValue={setName} placeholder="Ada Lovelace" required />
            <Field label="Email" name="email" type="email" value={email} setValue={setEmail} placeholder="ada@example.com" required />
            <p className="text-[11px] text-muted">The download link goes here — double-check it.</p>
            <Field label="Mobile number" name="phone" type="tel" value={phone} setValue={setPhone} placeholder="+91 98765 43210" required />
            <p className="text-[11px] text-muted">Used only for payment-gateway OTP + order support. We don&apos;t send marketing.</p>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-ink">Payment method</legend>
            <div className="grid sm:grid-cols-2 gap-3">
              <PayChoice
                checked={method === 'razorpay'} onClick={() => setMethod('razorpay')}
                title="Razorpay" sub="UPI · cards · netbanking" icon={<IndianRupee size={14} />}
                tag="India"
              />
              <PayChoice
                checked={method === 'stripe'} onClick={() => setMethod('stripe')}
                title="Stripe" sub="Cards · 135+ currencies" icon={<CreditCard size={14} />}
                tag="Global"
              />
            </div>
            <p className="text-[11px] text-muted">
              Razorpay uses inline Checkout.js; Stripe redirects to a hosted checkout page.
              Both are secured by the gateway — your card details never touch our servers.
            </p>
          </fieldset>

          {err && <p className="text-sm text-red-700 inline-flex items-center gap-1.5">⚠ {err}</p>}

          <button
            type="submit"
            disabled={busy}
            className="btn-primary w-full justify-center text-base py-3.5 disabled:opacity-60 disabled:cursor-wait"
          >
            {busy ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : <>Pay {formatMoney(subtotal, currency)} securely <Lock size={14} /></>}
          </button>
        </form>

        <aside className="lg:col-span-5">
          <div className="lg:sticky lg:top-24 tier-1 ambient-float p-6">
            <h2 className="font-display tracking-tight">Order summary</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {lines.map((l) => {
                const unit = currency === 'INR' ? l.priceInr : l.priceUsd;
                return (
                  <li key={l.productId} className="flex items-center gap-3 surface-lowest rounded-xl p-3 ambient-float">
                    <div
                      className="w-10 h-10 rounded-lg shrink-0 grid place-items-center font-display font-semibold text-ink/40"
                      style={{ background: `radial-gradient(circle at 30% 30%, ${l.coverColor}88, transparent 70%)` }}
                    >{l.title.slice(0, 1)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-ink">{l.title}</p>
                      <p className="text-[11px] text-muted">Qty {l.quantity}</p>
                    </div>
                    <span className="font-num text-sm text-ink">{formatMoney(unit * l.quantity, currency)}</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-5 pt-4 flex justify-between items-baseline">
              <span className="text-label-md text-ink-soft">Total</span>
              <span className="font-num font-semibold text-2xl text-gradient tracking-tight">{formatMoney(subtotal, currency)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label, name, value, setValue, placeholder, type = 'text', required = false,
}: {
  label: string; name: string; value: string; setValue: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">
        {label}{required && <span className="ml-1 text-primary" aria-hidden>*</span>}
      </span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="input-clean mt-2"
      />
    </label>
  );
}

function PayChoice({
  checked, onClick, title, sub, icon, tag,
}: {
  checked: boolean; onClick: () => void; title: string; sub: string;
  icon: React.ReactNode; tag?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.99 }}
      className={`text-left rounded-2xl p-4 transition ${
        checked
          ? 'bg-green-50 ring-2 ring-primary/40 ambient-float'
          : 'surface-low ghost-line hover:bg-surface-container'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 font-semibold text-ink">
          <span className="text-primary">{icon}</span> {title}
        </span>
        {tag && <span className="text-[10px] uppercase tracking-wider text-muted">{tag}</span>}
      </div>
      <p className="mt-1 text-xs text-ink-soft">{sub}</p>
    </motion.button>
  );
}
