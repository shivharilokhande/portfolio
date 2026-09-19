import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Mail, Download, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { profile as staticProfile } from '../lib/data';
import { useSection } from '../hooks/usePortfolioContent';
import { useBrand } from '../components/BrandLogo';
import { useCart } from './cartStore';

/**
 * SuccessPage — landing after Razorpay/Stripe payment succeeds.
 *
 * Two entry paths:
 *   1. Direct handoff from CheckoutPage — URL carries ?email=<buyer_email>.
 *      We poll {@code GET /api/store/orders/{id}?email=…} every 3s. Once the
 *      webhook flips the order to PAID and mints the download token, the
 *      "Open my downloads" button appears.
 *   2. Deep-link (e.g. buyer bookmarks the URL and comes back later) —
 *      no email query param; we can't prove ownership so we just show the
 *      "check your inbox" state and skip polling.
 */
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS  = 3 * 60_000;  // 3 minutes — beyond that we assume the
                                       // webhook is delayed and let the buyer
                                       // fall back to the email link.

function readStoredEmail(): string | null {
  try { return sessionStorage.getItem('checkout.email'); } catch { return null; }
}

export default function SuccessPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [params] = useSearchParams();
  // The mock path used to pass ?token= directly; keep that as a fast-path for
  // any legacy flows that still work that way.
  // Stripe's success_url passes ?token={CHECKOUT_SESSION_ID} (cs_…) — that is
  // NOT a download token, so ignore it here.
  const rawToken    = params.get('token');
  const legacyToken = rawToken && !rawToken.startsWith('cs_') ? rawToken : null;
  const email       = params.get('email') ?? readStoredEmail();
  const clearCart   = useCart((s) => s.clear);
  const profile = useSection<typeof staticProfile>('profile', staticProfile);
  const brand   = useBrand();

  const [pollingState, setPollingState] = useState<
    { kind: 'idle' } |
    { kind: 'polling'; attempts: number } |
    { kind: 'ready'; token: string } |
    { kind: 'timeout' } |
    { kind: 'no-lookup' }
  >(() => {
    if (legacyToken) return { kind: 'ready', token: legacyToken };
    if (!email || !orderId) return { kind: 'no-lookup' };
    return { kind: 'polling', attempts: 0 };
  });

  useEffect(() => {
    if (pollingState.kind !== 'polling') return;
    if (!email || !orderId) return;

    let cancelled = false;
    const startedAt = Date.now();

    async function tick() {
      if (cancelled) return;
      try {
        const url = `${API_BASE}/api/store/orders/${encodeURIComponent(orderId!)}?email=${encodeURIComponent(email!)}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          const body = await res.json() as { status?: string; downloadToken?: string | null };
          if (body.status === 'PAID' && body.downloadToken) {
            if (!cancelled) setPollingState({ kind: 'ready', token: body.downloadToken });
            return;
          }
        }
      } catch {
        // Network hiccups are fine — keep polling until the timeout.
      }
      if (cancelled) return;
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setPollingState({ kind: 'timeout' });
        return;
      }
      setPollingState((prev) => prev.kind === 'polling'
        ? { kind: 'polling', attempts: prev.attempts + 1 }
        : prev);
      window.setTimeout(tick, POLL_INTERVAL_MS);
    }

    // Kick off the first probe immediately so a fast webhook is reflected
    // without the initial 3-second wait.
    tick();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once the order is confirmed paid, the cart is spent — clear it.
  useEffect(() => {
    if (pollingState.kind === 'ready') clearCart();
  }, [pollingState.kind, clearCart]);

  const secondsElapsed = useMemo(() => {
    if (pollingState.kind !== 'polling') return 0;
    return pollingState.attempts * (POLL_INTERVAL_MS / 1000);
  }, [pollingState]);

  return (
    <div className="max-w-content mx-auto px-4 sm:px-6 py-12">
      <motion.div
        initial={false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="tier-3 ambient-float-lg p-9 sm:p-12 max-w-2xl mx-auto text-center"
      >
        <div className="mx-auto w-14 h-14 rounded-2xl bg-green-100 text-green-700 grid place-items-center ambient-float">
          <CheckCircle2 size={26} />
        </div>
        <h1 className="mt-6 font-display text-3xl sm:text-4xl tracking-tight">
          <span className="text-gradient">Payment received.</span> Welcome aboard.
        </h1>
        <p className="mt-4 text-ink-soft">
          Order <span className="font-num text-ink">#{orderId}</span> is confirmed. A magic link to your downloads
          is on its way to your inbox — usually within 60 seconds.
        </p>

        <div className="mt-8 grid sm:grid-cols-2 gap-4 text-left">
          <div className="tier-1 p-5 ambient-float">
            <Mail size={18} className="text-primary" />
            <h3 className="mt-3 font-semibold text-ink">Check your inbox</h3>
            <p className="mt-1 text-xs text-ink-soft leading-relaxed">Subject: &ldquo;Your {brand.fullBrand} downloads&rdquo;. Bookmark the link — it stays valid.</p>
          </div>
          <div className="tier-1 p-5 ambient-float">
            <Download size={18} className="text-primary" />
            <h3 className="mt-3 font-semibold text-ink">Or jump in now</h3>
            <p className="mt-1 text-xs text-ink-soft leading-relaxed">
              {pollingState.kind === 'ready'
                ? 'Your download page is ready — button below.'
                : pollingState.kind === 'polling'
                ? `Finalising with the payment gateway… (${secondsElapsed}s)`
                : pollingState.kind === 'timeout'
                ? 'Taking longer than usual — the email link will still work when it arrives.'
                : 'The email will land within 60 seconds — the link works from there.'}
            </p>
          </div>
        </div>

        {pollingState.kind === 'ready' && (
          <Link
            to={`/store/downloads/${pollingState.token}`}
            className="btn-primary mt-8 mx-auto inline-flex items-center gap-2 text-base py-3"
          >
            Open my downloads <ArrowRight size={14} />
          </Link>
        )}
        {pollingState.kind === 'polling' && (
          <div className="mt-8 inline-flex items-center gap-2 text-sm text-ink-soft">
            <Loader2 size={14} className="animate-spin" />
            Waiting for the payment gateway to confirm…
          </div>
        )}

        <p className="mt-6 text-[11px] text-muted">
          Need help? Reply to the email or write to{' '}
          <a className="underline text-primary" href={`mailto:${profile.email}`}>
            {profile.email}
          </a>.
        </p>
      </motion.div>
    </div>
  );
}
