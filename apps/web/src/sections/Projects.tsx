/**
 * Projects — Luminous Engine bento grid with store funnel.
 *
 *   Light tonal tiles (alternating tier-3 / tier-1), green energy gradient
 *   on Buy-in-Store badges, ambient float on hover, no 1px borders.
 */
import { motion } from 'framer-motion';
import { ArrowUpRight, ShoppingBag, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import SectionHeader from '../components/SectionHeader';
import { projects as staticProjects, type ProjectTile } from '../lib/data';
import { useSection } from '../hooks/usePortfolioContent';
import { copyDefaults, mergeCopy } from '../lib/copyDefaults';
import { useTilt } from '../hooks/useTilt';

type Span = ProjectTile['span'];

const spanClass: Record<Span, string> = {
  lg:   'md:col-span-2 lg:col-span-2 lg:row-span-2',
  wide: 'md:col-span-2 lg:col-span-2',
  tall: 'md:col-span-1 lg:col-span-1 lg:row-span-2',
  sm:   'md:col-span-1 lg:col-span-1',
};

function ProjectTileView({ p, idx }: { p: ProjectTile; idx: number }) {
  const { ref, onMove, onLeave } = useTilt<HTMLAnchorElement>(6);
  const span = p.span;
  const isHero = span === 'lg';
  const isStore = !!p.storeSlug;
  // Case-study tiles have no destination yet — render a non-anchor so we don't
  // ship dead `href="#"` links to production.
  const href = p.storeSlug ? `/store/${p.storeSlug}` : null;
  // Alternate tier-3 white and tier-1 surface-low for tonal layering
  const tier = idx % 2 === 0 ? 'tier-3' : 'tier-1';

  // Rendered INSIDE the motion.div — no component redefinition per render,
  // so React keeps refs stable and useTilt doesn't reset every parent update.
  const tiltStyle = {
    transform: 'perspective(1100px) rotateX(var(--rx,0)) rotateY(var(--ry,0))',
    transformStyle: 'preserve-3d' as const,
  };
  const wrapperClass = `group relative block overflow-hidden ${tier} ambient-float hover:ambient-float-lg transition-all duration-300 will-change-transform h-full`;

  const tileBody = (
    <>
        {/* spotlight on hover — soft primary tint */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background:
              'radial-gradient(280px circle at var(--mx,50%) var(--my,50%), rgba(0,209,102,0.08), transparent 60%)',
          }}
        />
        {/* tinted accent in corner */}
        <span
          aria-hidden
          className="absolute -right-16 -top-16 w-56 h-56 rounded-full blur-3xl opacity-25 group-hover:opacity-45 transition-opacity duration-500"
          style={{ background: p.accent }}
        />

        <div className={`relative flex flex-col h-full ${isHero ? 'p-7 sm:p-9' : 'p-6 sm:p-7'}`}>
          <header>
            <p className="text-label-sm text-muted">{p.metric}</p>
            <h3 className={`mt-3 font-display leading-tight tracking-tight ${isHero ? 'text-2xl sm:text-3xl' : 'text-xl'}`}>
              {p.title}
            </h3>
          </header>

          <p className={`mt-3 text-ink-soft leading-relaxed ${isHero ? 'text-base max-w-prose' : 'text-sm line-clamp-3'}`}>
            {p.blurb}
          </p>

          <div className="mt-auto pt-5 flex items-end justify-between gap-3">
            <ul className="flex flex-wrap gap-1.5">
              {p.stack.slice(0, isHero ? 6 : 4).map((s) => (
                <li key={s} className="chip-resource text-[10.5px] py-0.5">
                  {s}
                </li>
              ))}
            </ul>

            <span
              aria-hidden
              className={`shrink-0 grid place-items-center w-9 h-9 rounded-full surface-lowest ghost-line transition-colors duration-200 ${
                isStore
                  ? 'group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-primary-soft group-hover:text-on-primary'
                  : 'group-hover:bg-primary group-hover:text-on-primary'
              }`}
            >
              <ArrowUpRight size={15} className="transition-transform duration-200 group-hover:rotate-12" />
            </span>
          </div>

          {/* Top-right badge — Buy in Store / Case study */}
          <span
            className={`absolute ${isHero ? 'top-7 right-7' : 'top-5 right-5'} inline-flex items-center gap-1.5 text-[10.5px] font-semibold px-2.5 py-1 rounded-full ${
              isStore
                ? 'bg-gradient-to-br from-primary to-primary-soft text-on-primary ambient-float'
                : 'surface-lowest ghost-line text-ink-soft'
            }`}
          >
            {isStore ? (<><ShoppingBag size={11} /> Buy in Store</>) : (<><BookOpen size={11} /> Case study</>)}
          </span>
        </div>
    </>
  );

  return (
    <motion.div
      role="listitem"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay: idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.02 }}
      className={spanClass[span]}
    >
      {isStore && href ? (
        <Link
          to={href}
          ref={ref as unknown as React.Ref<HTMLAnchorElement>}
          onMouseMove={onMove as unknown as React.MouseEventHandler<HTMLAnchorElement>}
          onMouseLeave={onLeave as unknown as React.MouseEventHandler<HTMLAnchorElement>}
          className={wrapperClass}
          style={tiltStyle}
        >{tileBody}</Link>
      ) : (
        // Non-store case-study tile — plain div (no dead href).
        <div className={wrapperClass} style={tiltStyle}>
          {tileBody}
        </div>
      )}
    </motion.div>
  );
}

/** CMS-driven header for the Featured Work section. */
function ProjectsHeader() {
  const h = mergeCopy(useSection('copy', copyDefaults)).sectionHeaders.projects;
  return <SectionHeader eyebrow={h.eyebrow} title={h.title} description={h.description} />;
}

export default function Projects() {
  const projects = useSection<ProjectTile[]>('projects', staticProjects);
  return (
    <section id="projects" className="relative py-24 sm:py-32">
      <div className="aurora bg-[radial-gradient(circle_at_10%_30%,rgba(0,209,102,0.10),transparent_50%),radial-gradient(circle_at_90%_70%,rgba(10,92,207,0.08),transparent_50%)]" />

      <div className="relative z-10 max-w-content mx-auto px-4 sm:px-6">
        <ProjectsHeader />

        <div
          role="list"
          className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 auto-rows-[minmax(220px,auto)]"
        >
          {projects.map((p, i) => <ProjectTileView key={p.id} p={p} idx={i} />)}
        </div>

        {/* Store CTA — asymmetric (60/40 with floating button) */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mt-14 tier-3 ambient-float-lg p-7 sm:p-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8"
        >
          <div className="flex-1">
            <p className="text-label-md text-primary">Browse the store</p>
            <h3 className="mt-3 font-display text-2xl sm:text-3xl tracking-tight">
              <span className="text-gradient">Skip the rebuild.</span> Buy the source code & ship faster.
            </h3>
            <p className="mt-3 text-sm text-ink-soft max-w-2xl leading-relaxed">
              Each product is a complete codebase: source, setup guides, sample data, and free updates. Pay once · download instantly · MIT-license ready.
            </p>
          </div>
          <Link to="/store" className="btn-primary shrink-0">
            <ShoppingBag size={16} /> Open the store
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
