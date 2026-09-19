/**
 * LegalPage — renders Terms of Service, Privacy Policy, or Refund Policy
 * from a CMS section.
 *
 *   /legal/terms   → reads section 'legal.terms'
 *   /legal/privacy → reads section 'legal.privacy'
 *   /legal/refund  → reads section 'legal.refund'
 *
 * Each section stores:
 *   { title: string, lastUpdated: 'YYYY-MM-DD', body: markdown-ish string }
 *
 * Editable from /admin/portfolio → Legal → {tab}.
 */
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../sections/Footer';
import { useSection } from '../hooks/usePortfolioContent';
import { usePageMeta, breadcrumbLd, truncate } from '../hooks/usePageMeta';
import { SITE_NAME, absUrl } from '../lib/site';

type LegalDoc = { title: string; lastUpdated: string; body: string };

const KNOWN_SLUGS = ['terms', 'privacy', 'refund'] as const;
type LegalSlug = (typeof KNOWN_SLUGS)[number];

const META_TITLES: Record<LegalSlug, string> = {
  terms: 'Terms',
  privacy: 'Privacy Policy',
  refund: 'Refund Policy',
};

const FALLBACKS: Record<LegalSlug, LegalDoc> = {
  terms: {
    title: 'Terms of Service',
    lastUpdated: '',
    body: 'This page has not been configured yet. The site owner should edit it in /admin/portfolio → Legal → Terms.',
  },
  privacy: {
    title: 'Privacy Policy',
    lastUpdated: '',
    body: 'This page has not been configured yet. The site owner should edit it in /admin/portfolio → Legal → Privacy.',
  },
  refund: {
    title: 'Refund Policy',
    lastUpdated: '',
    body: 'This page has not been configured yet. The site owner should edit it in /admin/portfolio → Legal → Refund.',
  },
};

export default function LegalPage() {
  const { slug } = useParams<{ slug: string }>();
  const validSlug: LegalSlug = (KNOWN_SLUGS as readonly string[]).includes(slug ?? '')
    ? (slug as LegalSlug)
    : 'terms';

  const doc = useSection<LegalDoc>(`legal.${validSlug}`, FALLBACKS[validSlug]);
  const html = useMemo(() => renderMiniMarkdown(doc.body ?? ''), [doc.body]);

  const pageTitle = META_TITLES[validSlug];
  usePageMeta({
    title: `${pageTitle} — ${SITE_NAME}`,
    description: truncate(doc.body, 155) || `${doc.title} for ${SITE_NAME}.`,
    canonicalPath: `/legal/${validSlug}`,
    type: 'website',
    jsonLd: [
      {
        '@type': 'WebPage',
        name: doc.title || pageTitle,
        url: absUrl(`/legal/${validSlug}`),
        ...(doc.lastUpdated ? { dateModified: doc.lastUpdated } : {}),
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: absUrl('/') },
      },
      breadcrumbLd([
        { name: 'Home', path: '/' },
        { name: doc.title || pageTitle, path: `/legal/${validSlug}` },
      ]),
    ],
  });

  return (
    <>
      <Header />
      <main id="content" className="relative pt-28 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink transition mb-6"
          >
            <ArrowLeft size={13} /> Back to site
          </Link>

          <article className="tier-3 ambient-float p-8 sm:p-10">
            <header className="pb-6 mb-6 border-b border-outline-variant/20">
              <p className="text-label-md text-primary">Legal</p>
              <h1 className="mt-3 font-display text-3xl sm:text-4xl tracking-tight text-ink">
                {doc.title}
              </h1>
              {doc.lastUpdated && (
                <p className="mt-2 text-xs text-muted font-num">
                  Last updated: {doc.lastUpdated}
                </p>
              )}
            </header>

            <div
              className="prose-legal"
              // The renderer output is escaped for HTML then re-wrapped with
              // the tiny set of tags we allow — safe for CMS-managed content
              // written by the site owner.
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </article>

          <nav className="mt-8 flex flex-wrap gap-2 justify-center">
            <LegalNavLink to="/legal/terms"   label="Terms of Service" active={validSlug === 'terms'} />
            <LegalNavLink to="/legal/privacy" label="Privacy Policy"   active={validSlug === 'privacy'} />
            <LegalNavLink to="/legal/refund"  label="Refund Policy"    active={validSlug === 'refund'} />
          </nav>
        </div>
      </main>
      <Footer />
    </>
  );
}

function LegalNavLink({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
        active
          ? 'bg-gradient-to-br from-primary to-primary-soft text-on-primary ambient-float'
          : 'surface-low ghost-line text-ink-soft hover:text-ink hover:bg-surface-container'
      }`}
    >
      {label}
    </Link>
  );
}

/* --------------------------------------------------------------------
 * Tiny, safe markdown-ish renderer. NOT a full CommonMark parser —
 * intentionally supports only what legal pages need:
 *
 *   ##  heading         → <h2>
 *   ### sub-heading     → <h3>
 *   - bullet            → <ul><li>…</li></ul>
 *   **bold**            → <strong>…</strong>
 *   [text](url)         → <a href="url" rel="noopener noreferrer">…</a>
 *   blank line          → new paragraph
 *
 * Every other character is HTML-escaped first, so the input can't inject
 * script tags or arbitrary HTML.
 * ------------------------------------------------------------------ */
function renderMiniMarkdown(src: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;')
     .replace(/</g, '&lt;')
     .replace(/>/g, '&gt;')
     .replace(/"/g, '&quot;')
     .replace(/'/g, '&#39;');

  // Inline formatting (bold, links) applied AFTER escaping. The regexes
  // match escaped input so they can't be tricked by e.g. `**<script**`.
  const inline = (s: string) => s
    .replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text, url) => {
      // Only allow http(s), mailto, and same-origin absolute paths.
      const safeUrl = /^(https?:\/\/|mailto:|\/)/.test(url) ? url : '#';
      const external = /^https?:/.test(safeUrl);
      const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${safeUrl}"${attrs}>${text}</a>`;
    });

  const escaped = escape(src);
  const lines = escaped.split('\n');
  const out: string[] = [];

  let inList = false;
  let paraBuf: string[] = [];

  const flushPara = () => {
    if (paraBuf.length === 0) return;
    out.push(`<p>${inline(paraBuf.join(' '))}</p>`);
    paraBuf = [];
  };
  const closeList = () => {
    if (inList) { out.push('</ul>'); inList = false; }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (/^\s*$/.test(line)) {
      flushPara();
      closeList();
      continue;
    }
    if (/^### /.test(line)) {
      flushPara(); closeList();
      out.push(`<h3>${inline(line.replace(/^###\s+/, ''))}</h3>`);
      continue;
    }
    if (/^## /.test(line)) {
      flushPara(); closeList();
      out.push(`<h2>${inline(line.replace(/^##\s+/, ''))}</h2>`);
      continue;
    }
    if (/^- /.test(line)) {
      flushPara();
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inline(line.replace(/^-\s+/, ''))}</li>`);
      continue;
    }
    closeList();
    paraBuf.push(line.trim());
  }
  flushPara();
  closeList();

  return out.join('\n');
}
