import { useEffect } from 'react';
import GlowButton from '../components/GlowButton';

export default function NotFoundPage() {
  // Tell crawlers this SPA fallback is not a page worth indexing (soft-404 guard).
  useEffect(() => {
    const m = document.createElement('meta');
    m.name = 'robots'; m.content = 'noindex';
    document.head.appendChild(m);
    const prevTitle = document.title;
    document.title = 'Page not found — shivhari.tech';
    return () => { m.remove(); document.title = prevTitle; };
  }, []);
  return (
    <div className="min-h-screen grid place-items-center text-center px-4 bg-bg">
      <div className="glass-strong rounded-3xl px-8 py-10 max-w-md">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand2">404</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold text-gradient">Page not found.</h1>
        <p className="mt-3 text-muted">That URL doesn&apos;t lead anywhere on this site.</p>
        {/* Single anchor — previously a <Link> wrapped a GlowButton rendered
            as an <a>, producing nested <a> tags which is invalid HTML and
            makes click behaviour undefined in some browsers. GlowButton
            already renders its own anchor when `as="a"`. */}
        <div className="mt-6 inline-block">
          <GlowButton as="a" href="/" variant="primary">Back to portfolio</GlowButton>
        </div>
      </div>
    </div>
  );
}
