/**
 * PortfolioPage — the editorial one-page portfolio.
 *
 *   Hero → About → Skills → Timeline → Projects → Testimonials → Services →
 *   Contact. The Luminous Engine design is light + tonal; the legacy dark
 *   cinema frame sequence has been retired in favour of a subtle ambient
 *   layer set by each section. The frame assets and loader remain in the
 *   codebase if we ever revive the cinematic mode.
 */
import { Suspense, lazy, useEffect, useState } from 'react';
import Header from '../components/Header';
import ScrollProgress from '../components/ScrollProgress';
import ScrollAurora from '../components/ScrollAurora';
import LoadingScreen, { BOOT_MAX_MS } from '../components/LoadingScreen';
import Hero from '../sections/Hero';
import About from '../sections/About';
import Timeline from '../sections/Timeline';
import Projects from '../sections/Projects';
import Testimonials from '../sections/Testimonials';
import Services from '../sections/Services';
import Contact from '../sections/Contact';
import Footer from '../sections/Footer';
// PortfolioContentProvider now wraps <Routes> at the App root so every
// route (Legal, Store, Footer) can useSection. This file no longer nests
// its own provider.

const Skills = lazy(() => import('../sections/Skills'));

export default function PortfolioPage() {
  const [booted, setBooted] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Single gate: the display fonts. Resolve on `document.fonts.ready` or
    // BOOT_MAX_MS, whichever comes first — the loader only exists to stop a
    // fallback-font flash on the hero, nothing else is awaited.
    let cancelled = false;
    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      setProgress(100);
      setBooted(true);
    };
    const start = performance.now();
    const tick = window.setInterval(() => {
      setProgress(Math.min(90, ((performance.now() - start) / BOOT_MAX_MS) * 100));
    }, 60);
    const cap = window.setTimeout(finish, BOOT_MAX_MS);
    const fontsReady: Promise<unknown> =
      typeof document !== 'undefined' && 'fonts' in document
        ? document.fonts.ready
        : Promise.resolve();
    fontsReady.then(finish, finish);
    return () => {
      cancelled = true;
      window.clearInterval(tick);
      window.clearTimeout(cap);
    };
  }, []);

  return (
    <div className="relative min-h-screen surface text-ink overflow-x-hidden">
      <LoadingScreen
        progress={progress}
        done={booted}
        label="Preparing the experience"
      />

      <ScrollProgress />
      <ScrollAurora />
      <Header />

      <main id="content" className="relative z-10">
        <Hero />
        <About />
        <Suspense fallback={<div className="h-[60vh]" aria-hidden />}>
          <Skills />
        </Suspense>
        <Timeline />
        <Projects />
        <Testimonials />
        <Services />
        <Contact />
      </main>

      {/* Footer's useSection('profile') resolves against the App-level
          PortfolioContentProvider that wraps the entire route tree. */}
      <Footer />
    </div>
  );
}
