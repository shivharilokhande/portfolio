/**
 * DownloadsPage — magic-link buyer page.
 *
 *   /store/downloads/:token
 *
 *   Server returns the full DownloadBundleDto for the token (items + signed
 *   per-file URLs). In demo mode (no backend), we synthesize from cart history.
 */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, ShieldCheck, ExternalLink, Clock, ArrowRight } from 'lucide-react';
import { store, type DownloadBundleDto } from './storeApi';
import { usePageMeta } from '../hooks/usePageMeta';
import { SITE_NAME } from '../lib/site';

export default function DownloadsPage() {
  const { token } = useParams<{ token: string }>();
  const [bundle, setBundle] = useState<DownloadBundleDto | null | undefined>(undefined);

  usePageMeta({ title: `Your downloads — ${SITE_NAME}`, canonicalPath: `/store/downloads/${token ?? ''}`, noindex: true });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) { setBundle(null); return; }
      // Always hit the backend — Vite dev proxy forwards even when VITE_API_URL is blank.
      // Only fall back to the demo bundle on a genuine network error (server truly down).
      try {
        const b = await store.getDownloads(token);
        if (!cancelled) setBundle(b);
      } catch (e) {
        const status = (e as { status?: number })?.status;
        const isNetwork = status === undefined && e instanceof TypeError;
        if (!cancelled) setBundle(isNetwork ? __demoBundle(token) : null);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (bundle === undefined) {
    return (
      <div className="max-w-content mx-auto px-4 sm:px-6 py-10">
        <div className="h-72 shimmer rounded-3xl" />
      </div>
    );
  }
  if (bundle === null) {
    return (
      <div className="max-w-content mx-auto px-4 sm:px-6 py-12 text-center">
        <div className="tier-3 ambient-float-lg p-10 max-w-md mx-auto">
          <h1 className="font-display text-2xl tracking-tight">Link not valid</h1>
          <p className="mt-2 text-ink-soft text-sm">This download link is broken or expired. If you bought from us, reply to your order email and we&apos;ll re-issue it.</p>
          <Link to="/store" className="btn-tertiary mt-5 mx-auto">
            Back to catalog <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-content mx-auto px-4 sm:px-6 py-6">
      <header className="tier-3 ambient-float-lg p-7 sm:p-9">
        <p className="text-label-md text-primary">your downloads</p>
        <h1 className="mt-3 font-display text-3xl tracking-tight">
          <span className="text-gradient">Thanks for buying.</span> Grab your files.
        </h1>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <span className="chip-resource"><ShieldCheck size={12} className="text-primary" /> Order #{bundle.orderId}</span>
          <span className="chip-resource"><Clock size={12} /> Valid until {fmtDate(bundle.expiresAt)}</span>
          <span className="chip-resource">Sent to {bundle.email}</span>
        </div>
      </header>

      <ul className="mt-8 space-y-4">
        {bundle.items.map((it, idx) => (
          <li key={it.productId} className={`${idx % 2 === 0 ? 'tier-3' : 'tier-1'} ambient-float p-6 flex flex-wrap items-center gap-4`}>
            <div className="flex-1 min-w-[200px]">
              <Link to={`/store/${it.slug}`} className="font-semibold text-ink hover:text-primary transition inline-flex items-center gap-1.5">
                {it.title} <ExternalLink size={12} className="opacity-70" />
              </Link>
              <p className="mt-1 text-xs text-ink-soft font-num">{it.fileSizeMb} MB · source archive · MIT-license-ready</p>
            </div>
            {it.downloadUrl && it.downloadUrl !== '#' ? (
              <a href={it.downloadUrl} download className="btn-primary text-sm">
                <Download size={14} /> Download
              </a>
            ) : (
              // Demo-mode bundles ship with '#' as the URL. Rendering it as
              // an active link would just jump the page to the top and
              // baffle the buyer. Show a static chip instead.
              <span
                className="btn-primary text-sm opacity-60 cursor-not-allowed"
                aria-disabled="true"
                title="Demo mode — no downloadable file"
              >
                <Download size={14} /> Demo mode
              </span>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-8 text-xs text-muted">
        Bookmark this page. The link stays valid until {fmtDate(bundle.expiresAt)}. If you lose it,
        reply to your order email and we&apos;ll re-issue.
      </p>
    </div>
  );
}

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString(undefined, { dateStyle: 'medium' }); }
  catch { return s; }
}

function __demoBundle(token: string): DownloadBundleDto {
  const expires = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
  return {
    orderId: 0, email: 'you@example.com', paidAt: new Date().toISOString(), expiresAt: expires,
    items: [
      { productId: 1, slug: 'spring-boot-microservices-kit', title: 'Spring Boot Microservices Starter Kit', fileSizeMb: 28, downloadUrl: '#' },
      { productId: 5, slug: 'cinematic-portfolio-template', title: 'Cinematic Portfolio Template', fileSizeMb: 12, downloadUrl: '#' },
    ].slice(0, Math.max(1, token.length % 3)),
  };
}
