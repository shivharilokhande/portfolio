import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Loader2, AlertCircle } from 'lucide-react';
import { adminApi } from './adminApi';
import BrandLogo from '../components/BrandLogo';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!email || !password) { setErr('Both fields are required.'); return; }
    setBusy(true);
    try {
      await adminApi.login(email, password);
      navigate('/admin/dashboard', { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign-in failed.';
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 surface relative overflow-hidden">
      {/* primary aurora — calm */}
      <div className="aurora bg-[radial-gradient(circle_at_25%_30%,rgba(0,209,102,0.12),transparent_55%),radial-gradient(circle_at_75%_70%,rgba(10,92,207,0.08),transparent_55%)]" />

      <motion.form
        onSubmit={onSubmit}
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="tier-3 ambient-float-lg p-8 sm:p-10 max-w-md w-full relative z-10"
      >
        <div className="flex items-center gap-2">
          <BrandLogo />
          <span className="text-[9px] font-num uppercase tracking-[0.18em] text-primary surface-low ghost-line rounded px-1.5 py-0.5">admin</span>
        </div>

        <h1 className="mt-7 font-display text-2xl tracking-tight">Sign in to admin</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Manage orders, inquiries, and the store catalog.
        </p>

        <label className="block mt-6">
          <span className="text-sm font-medium text-ink">Admin email</span>
          <input
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="input-clean mt-2"
          />
        </label>

        <label className="block mt-4">
          <span className="text-sm font-medium text-ink">Password</span>
          <input
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="input-clean mt-2"
          />
        </label>

        {err && (
          <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-red-700">
            <AlertCircle size={14} /> {err}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="btn-primary mt-6 w-full justify-center disabled:opacity-60 disabled:cursor-wait"
        >
          {busy ? <><Loader2 size={14} className="animate-spin" /> Signing in…</> : <><LogIn size={14} /> Sign in</>}
        </button>

      </motion.form>
    </div>
  );
}
