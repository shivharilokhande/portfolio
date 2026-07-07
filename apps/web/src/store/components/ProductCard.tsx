import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useCart, formatMoney } from '../cartStore';
import type { ProductDto } from '../storeApi';

export default function ProductCard({ p, idx = 0 }: { p: ProductDto; idx?: number }) {
  const currency = useCart((s) => s.currency);
  const price = currency === 'INR' ? p.priceInr : p.priceUsd;

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay: idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className={`group relative overflow-hidden ambient-float hover:ambient-float-lg transition-shadow ${
        idx % 2 === 0 ? 'tier-3' : 'tier-1'
      }`}
    >
      <Link
        to={`/store/${p.slug}`}
        className="block focus-visible:outline-none"
        aria-label={`${p.title} · view details`}
      >
        {/* Cover — tinted with product accent + soft primary glow */}
        <div
          className="relative h-44 sm:h-52 overflow-hidden"
          style={{
            background: `radial-gradient(120% 80% at 30% 30%, ${p.coverColor}55, transparent 70%), radial-gradient(120% 80% at 70% 90%, rgb(var(--primary-soft) / 0.30), transparent 70%)`,
          }}
        >
          <div className="absolute inset-0 grid place-items-center">
            <div className="font-display font-semibold text-7xl text-ink/15 select-none">
              {p.title.slice(0, 1)}
            </div>
          </div>
          {p.featured && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md bg-gradient-to-br from-primary to-primary-soft text-on-primary ambient-float">
              Featured
            </span>
          )}
          <span className="absolute top-3 right-3 inline-flex items-center text-[10px] font-num uppercase tracking-wider px-2 py-1 rounded-md glass">
            v{p.version}
          </span>
        </div>

        <div className="p-6">
          <p className="text-label-sm text-primary">{p.category}</p>
          <h3 className="mt-2 font-display text-lg leading-tight tracking-tight">{p.title}</h3>
          <p className="mt-2 text-sm text-ink-soft line-clamp-2 leading-relaxed">{p.tagline}</p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {p.tags.slice(0, 3).map((t) => (
              <span key={t} className="chip-resource text-[10.5px] py-0.5">{t}</span>
            ))}
          </div>

          <div className="mt-5 flex items-baseline justify-between gap-3">
            <div>
              <span className="font-num font-semibold text-2xl text-gradient tracking-tight">
                {formatMoney(price, currency)}
              </span>
              <span className="ml-2 text-[11px] text-muted">one-time</span>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
              View <ArrowUpRight size={14} />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
