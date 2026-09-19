/**
 * AdminLayout — Luminous Engine chrome for every /admin/* route.
 *
 *   Sidebar (sticky) + content outlet on light editorial surfaces.
 *   Auth-gated: if no token, redirect to /admin/login.
 *   The login page renders standalone (no sidebar).
 */
import { Outlet, NavLink, useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, MessageSquare, Package,
  LogOut, ArrowLeft, FileText, Settings as SettingsIcon,
} from 'lucide-react';
import { adminApi, adminToken } from './adminApi';
import BrandLogo, { BrandWordmark } from '../components/BrandLogo';
import { usePageMeta } from '../hooks/usePageMeta';
import { SITE_NAME } from '../lib/site';

const nav = [
  { to: '/admin/dashboard', label: 'Dashboard',     icon: <LayoutDashboard size={16} /> },
  { to: '/admin/orders',    label: 'Orders',        icon: <ShoppingBag    size={16} /> },
  { to: '/admin/contacts',  label: 'Inquiries',     icon: <MessageSquare  size={16} /> },
  { to: '/admin/products',  label: 'Products',      icon: <Package        size={16} /> },
  { to: '/admin/portfolio', label: 'Portfolio CMS', icon: <FileText       size={16} /> },
  { to: '/admin/settings',  label: 'Settings',      icon: <SettingsIcon   size={16} /> },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin  = location.pathname === '/admin/login' || location.pathname === '/admin';

  // Admin is never indexable; canonical is the page itself (no home canonical leak).
  usePageMeta({ title: `Admin — ${SITE_NAME}`, canonicalPath: location.pathname, noindex: true });

  // Synchronous gate — never render the sidebar / Outlet without a token.
  // The previous useEffect-based redirect briefly mounted admin pages
  // (firing their fetches and 401 error banners) before the redirect ran.
  if (!isLogin && !adminToken.get()) {
    return <Navigate to="/admin/login" replace />;
  }

  if (isLogin) {
    return (
      <div className="theme-soft relative min-h-screen overflow-x-hidden surface">
        <Outlet />
      </div>
    );
  }

  async function onLogout() {
    try { await adminApi.logout(); } catch { /* best effort — still clear + navigate */ }
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="theme-soft relative min-h-screen overflow-x-hidden surface">
      <div className="relative z-10 flex min-h-screen">

        {/* SIDEBAR — sticky, surface-low base (one tier above page) */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 sticky top-0 h-screen p-4 surface-low">
          <Link to="/admin/dashboard" className="flex items-center gap-2 px-2 py-2">
            <BrandLogo />
            <span className="ml-1 text-[9px] font-num uppercase tracking-[0.18em] text-primary surface-lowest ghost-line rounded px-1.5 py-0.5">admin</span>
          </Link>

          <nav className="mt-6 flex flex-col gap-1 text-sm">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2.5 px-3 py-2 rounded-lg transition ${
                    isActive
                      ? 'bg-gradient-to-br from-primary to-primary-soft text-on-primary ambient-float'
                      : 'text-ink-soft hover:text-ink hover:bg-surface-container/70'
                  }`
                }
              >
                {n.icon} {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto pt-4 space-y-1 text-sm">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-ink-soft hover:text-ink hover:bg-surface-container/70 transition w-full"
            >
              <ArrowLeft size={14} /> Back to portfolio
            </Link>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-ink-soft hover:text-red-700 hover:bg-red-50 transition w-full"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </aside>

        {/* MOBILE TOP BAR */}
        <header className="md:hidden fixed top-0 inset-x-0 z-30 glass ambient-float">
          <div className="px-4 h-14 flex items-center justify-between">
            <Link to="/admin/dashboard" className="inline-flex items-center gap-2">
              <BrandWordmark className="text-sm" />
              <span className="text-[9px] font-num uppercase tracking-[0.18em] text-primary surface-lowest ghost-line rounded px-1 py-0.5">admin</span>
            </Link>
            <button onClick={onLogout} className="text-xs text-ink-soft hover:text-red-700">Sign out</button>
          </div>
          <div className="flex overflow-x-auto px-3 pb-2 gap-1 text-xs">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition ${
                    isActive
                      ? 'bg-gradient-to-br from-primary to-primary-soft text-on-primary'
                      : 'chip-resource'
                  }`
                }
              >
                {n.icon} {n.label}
              </NavLink>
            ))}
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8 pt-28 md:pt-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
