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
import LoadingScreen from '../components/LoadingScreen';
import Hero from '../sections/Hero';
import About from '../sections/About';
import Timeline from '../sections/Timeline';
import Projects from '../sections/Projects';
import Testimonials from '../sections/Testimonials';
import Services from '../sections/Services';
import Contact from '../sections/Contact';
import Footer from '../sections/Footer';
import { PortfolioContentProvider } from '../hooks/usePortfolioContent';

const Skills = lazy(() => import('../sections/Skills'));

export default function PortfolioPage() {
  const [booted, setBooted] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Quick boot — light editorial doesn't need to pre-buffer frames.
    let frame = 0;
    const id = window.setInterval(() => {
      frame += 1;
      setProgress(Math.min(100, frame * 22));
      if (frame >= 5) {
        setBooted(true);
        window.clearInterval(id);
      }
    }, 80);
    return () => window.clearInterval(id);
  }, []);

  return (
    <PortfolioContentProvider>
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

        {/* Footer must stay INSIDE the Provider so its useSection('profile')
            picks up admin CMS edits (was previously outside → footer stayed
            on static data forever). */}
        <Footer />
      </div>
    </PortfolioContentProvider>
  );
}
