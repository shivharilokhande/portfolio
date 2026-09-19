/**
 * /services/:slug — indexable landing page per service.
 *
 *   Structure is deliberately "answer first": eyebrow, H1 with the keyword,
 *   a quotable 2–3 sentence answer, proof numbers, deliverables, process,
 *   fit, FAQ, CTA. Schema: Service + FAQPage + BreadcrumbList.
 */
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, CalendarDays, Mail } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../sections/Footer';
import { usePageMeta, breadcrumbLd } from '../hooks/usePageMeta';
import { SITE_NAME, absUrl } from '../lib/site';
import { profile as staticProfile } from '../lib/data';
import { useSection } from '../hooks/usePortfolioContent';
import { findServicePage, servicePages, legacyServiceSlugs } from '../lib/servicePages';

export default function ServicePage() {
  const { slug } = useParams<{ slug: string }>();
  const page = findServicePage(slug);
  const profile = useSection('profile', staticProfile);
  if (!page) {
    const to = slug && legacyServiceSlugs[slug];
    return <Navigate to={to ? `/services/${to}` : '/#services'} replace />;
  }

  const path = `/services/${page.slug}`;
  const bookHref = profile.calendarUrl || '/#contact';

  usePageMeta({
    title: page.title,
    description: page.description,
    canonicalPath: path,
    type: 'website',
    jsonLd: [
      {
        '@type': 'Service',
        '@id': absUrl(path) + '#service',
        name: page.keyword,
        serviceType: page.serviceType,
        description: page.answer,
        url: absUrl(path),
        provider: { '@id': absUrl('/') + '#person' },
        areaServed: ['US', 'IN', 'GB', 'AE'],
        availableChannel: { '@type': 'ServiceChannel', serviceUrl: absUrl('/#contact'), availableLanguage: 'en' },
      },
      {
        '@type': 'WebPage',
        url: absUrl(path),
        name: page.title,
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: absUrl('/') },
        about: { '@id': absUrl(path) + '#service' },
        speakable: { '@type': 'SpeakableSpecification', cssSelector: ['#service-answer'] },
      },
      {
        '@type': 'FAQPage',
        mainEntity: page.faq.map((f) => ({
          '@type': 'Question', name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      breadcrumbLd([
        { name: 'Home', path: '/' },
        { name: 'Services', path: '/#services' },
        { name: page.keyword, path },
      ]),
    ],
  });

  return (
    <>
      <Header />
      <main id="content" className="relative pt-28 pb-16">
        <div className="max-w-content mx-auto px-4 sm:px-6">
          <nav aria-label="Breadcrumb" className="text-xs text-ink-soft flex flex-wrap gap-1.5 items-center">
            <Link to="/" className="hover:text-ink">Home</Link><span aria-hidden>›</span>
            <Link to="/#services" className="hover:text-ink">Services</Link><span aria-hidden>›</span>
            <span className="text-ink" aria-current="page">{page.keyword}</span>
          </nav>

          {/* Hero */}
          <header className="mt-6 grid lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-8">
              <p className="text-label-md text-primary">{page.eyebrow}</p>
              <h1 className="mt-3 font-display text-headline-lg sm:text-display-md tracking-tight text-ink [text-wrap:balance]">{page.h1}</h1>
              <p id="service-answer" className="mt-5 text-lg leading-relaxed text-ink-soft max-w-3xl">{page.answer}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href={bookHref} className="btn-primary min-h-[44px]" target={bookHref.startsWith('http') ? '_blank' : undefined} rel={bookHref.startsWith('http') ? 'noopener noreferrer' : undefined}>
                  <CalendarDays size={16} /> Book a free 30-min discovery call
                </a>
                <a href={`mailto:${profile.email}`} className="inline-flex items-center gap-2 px-5 min-h-[44px] rounded-lg surface-low ghost-line text-ink font-semibold hover:bg-surface-container transition">
                  <Mail size={16} /> Email {profile.shortName || 'me'}
                </a>
              </div>
              <p className="mt-3 text-xs text-muted">{page.priceNote}</p>
            </div>
            <aside className="lg:col-span-4 grid grid-cols-2 gap-3">
              {page.outcomes.map((o) => (
                <div key={o.label} className="tier-2 rounded-2xl p-4">
                  <div className="font-num text-2xl font-bold text-ink tabular-nums">{o.stat}</div>
                  <div className="mt-1 text-xs text-ink-soft leading-snug">{o.label}</div>
                </div>
              ))}
            </aside>
          </header>

          {/* Deliverables + fit */}
          <section className="mt-16 grid lg:grid-cols-12 gap-8" aria-labelledby="deliverables-title">
            <div className="lg:col-span-7">
              <h2 id="deliverables-title" className="font-display text-headline-md text-ink">What you get</h2>
              <ul className="mt-5 grid gap-3">
                {page.deliverables.map((d) => (
                  <li key={d} className="flex gap-3 text-ink-soft leading-relaxed"><Check size={18} className="text-primary shrink-0 mt-1" aria-hidden />{d}</li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-5 tier-3 rounded-2xl p-6">
              <h2 className="font-display text-xl text-ink">This is for you if…</h2>
              <ul className="mt-4 grid gap-3 text-ink-soft leading-relaxed">
                {page.fit.map((f) => <li key={f} className="flex gap-3"><span className="text-primary" aria-hidden>→</span>{f}</li>)}
              </ul>
            </div>
          </section>

          {/* Process */}
          <section className="mt-16" aria-labelledby="process-title">
            <h2 id="process-title" className="font-display text-headline-md text-ink">How an engagement runs</h2>
            <ol className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {page.process.map((p, i) => (
                <li key={p.step} className="tier-2 rounded-2xl p-5">
                  <div className="font-num text-xs text-muted">Step {i + 1}</div>
                  <h3 className="mt-1 font-display text-lg text-ink">{p.step}</h3>
                  <p className="mt-2 text-sm text-ink-soft leading-relaxed">{p.detail}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* FAQ */}
          <section className="mt-16 max-w-3xl" aria-labelledby="faq-title">
            <h2 id="faq-title" className="font-display text-headline-md text-ink">Questions clients ask</h2>
            <div className="mt-6 grid gap-4">
              {page.faq.map((f) => (
                <div key={f.q} className="tier-2 rounded-2xl p-5">
                  <h3 className="font-display text-lg text-ink">{f.q}</h3>
                  <p className="mt-2 text-ink-soft leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA + related */}
          <section className="mt-16 tier-3 ambient-float rounded-3xl p-8 sm:p-10 grid lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8">
              <h2 className="font-display text-headline-md text-ink">Start with a 30-minute call</h2>
              <p className="mt-3 text-ink-soft leading-relaxed">Bring the problem; leave with a written scope, a timeline and a price. No deck, no pressure — I reply within 24 hours.</p>
            </div>
            <div className="lg:col-span-4 flex lg:justify-end">
              <a href={bookHref} className="btn-primary min-h-[44px]" target={bookHref.startsWith('http') ? '_blank' : undefined} rel={bookHref.startsWith('http') ? 'noopener noreferrer' : undefined}>
                Book the call <ArrowRight size={16} />
              </a>
            </div>
          </section>

          <nav aria-label="Other services" className="mt-10 flex flex-wrap gap-2">
            {page.related.map((r) => {
              const rp = servicePages.find((s) => s.slug === r);
              return rp ? (
                <Link key={r} to={`/services/${r}`} className="chip-resource text-primary hover:bg-surface-container transition min-h-[36px]">
                  {rp.keyword} <ArrowRight size={12} />
                </Link>
              ) : null;
            })}
            <Link to="/portfolio/" reloadDocument className="chip-resource text-ink-soft hover:bg-surface-container transition min-h-[36px]">See the cinematic portfolio <ArrowRight size={12} /></Link>
          </nav>
        </div>
      </main>
      <Footer />
    </>
  );
}
