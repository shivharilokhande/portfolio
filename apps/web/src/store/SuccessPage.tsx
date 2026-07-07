import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Mail, Download, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { profile as staticProfile } from '../lib/data';
import { useSection } from '../hooks/usePortfolioContent';
import { useBrand } from '../components/BrandLogo';

export default function SuccessPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [params] = useSearchParams();
  const token = params.get('token');
  const profile = useSection<typeof staticProfile>('profile', staticProfile);
  const brand   = useBrand();

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
            <p className="mt-1 text-xs text-ink-soft leading-relaxed">Use the button below to open your downloads page directly.</p>
          </div>
        </div>

        {token && (
          <Link to={`/store/downloads/${token}`} className="btn-primary mt-8 mx-auto text-base py-3">
            Open my downloads <ArrowRight size={14} />
          </Link>
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
