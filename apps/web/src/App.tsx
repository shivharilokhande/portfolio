import { lazy, Suspense } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import ScrollToHash from './components/ScrollToHash';
import { useSiteMeta } from './hooks/useSiteMeta';
import { PortfolioContentProvider } from './hooks/usePortfolioContent';

const PortfolioPage  = lazy(() => import('./pages/PortfolioPage'));
const StoreLayout    = lazy(() => import('./store/StoreLayout'));
const StoreHomePage  = lazy(() => import('./store/StoreHomePage'));
const ProductPage    = lazy(() => import('./store/ProductPage'));
const CartPage       = lazy(() => import('./store/CartPage'));
const CheckoutPage   = lazy(() => import('./store/CheckoutPage'));
const SuccessPage    = lazy(() => import('./store/SuccessPage'));
const DownloadsPage  = lazy(() => import('./store/DownloadsPage'));
const NotFoundPage   = lazy(() => import('./pages/NotFoundPage'));
const LegalPage      = lazy(() => import('./pages/LegalPage'));
const ServicePage    = lazy(() => import('./pages/ServicePage'));

const AdminLayout            = lazy(() => import('./admin/AdminLayout'));
const AdminLoginPage         = lazy(() => import('./admin/AdminLoginPage'));
const AdminDashboardPage     = lazy(() => import('./admin/AdminDashboardPage'));
const AdminOrdersPage        = lazy(() => import('./admin/AdminOrdersPage'));
const AdminContactsPage      = lazy(() => import('./admin/AdminContactsPage'));
const AdminProductsPage      = lazy(() => import('./admin/AdminProductsPage'));
const AdminProductFormPage   = lazy(() => import('./admin/AdminProductFormPage'));
const AdminPortfolioPage     = lazy(() => import('./admin/AdminPortfolioPage'));
const AdminSettingsPage      = lazy(() => import('./admin/AdminSettingsPage'));

/**
 * App shell — route surface.
 *
 *   /                              → Portfolio (cinema + sections)
 *   /store                         → Store catalog
 *   /store/cart  ·  /checkout  ·  /success/:id  ·  /downloads/:token  ·  /:slug
 *   /admin/login                   → Admin sign-in
 *   /admin                         → redirects to /admin/dashboard (or /admin/login)
 *   /admin/dashboard               → Overview stats
 *   /admin/orders                  → Order list
 *   /admin/contacts                → Inquiry inbox
 *   /admin/products                → Catalog manager
 *   *                              → 404
 */
export default function App() {
  // Runtime-sync <title> + OG + canonical from the CMS Profile row so
  // buyers of the template can rebrand SEO without editing index.html.
  useSiteMeta();
  return (
    // Provider lifted here (was previously only inside PortfolioPage) so
    // useSection() works on every route that renders CMS-driven UI —
    // notably LegalPage (/legal/:slug), the Footer, and Header. Without it,
    // those components fall back to static defaults even when the CMS row
    // is populated. Polling overhead is ~one request per 20s while the tab
    // is visible; the /api/portfolio endpoint is public and cheap.
    <PortfolioContentProvider>
    <Suspense fallback={<div className="min-h-screen bg-bg" aria-hidden />}>
      {/* Rescues in-page anchor navigation across lazy-loaded routes. */}
      <ScrollToHash />
      <Routes>
        <Route path="/" element={<PortfolioPage />} />

        {/* Legal pages — required by every payment gateway before they'll
            approve live-mode. Content lives in CMS sections legal.terms /
            legal.privacy / legal.refund, edited under /admin/portfolio →
            Legal. */}
        <Route path="/legal/:slug" element={<LegalPage />} />

        {/* Service landing pages — one indexable URL per buyer keyword. */}
        <Route path="/services/:slug" element={<ServicePage />} />

        {/* Store */}
        <Route path="/store" element={<StoreLayout />}>
          <Route index element={<StoreHomePage />} />
          <Route path="cart"               element={<CartPage />} />
          <Route path="checkout"           element={<CheckoutPage />} />
          <Route path="success/:orderId"   element={<SuccessPage />} />
          <Route path="downloads/:token"   element={<DownloadsPage />} />
          <Route path=":slug"              element={<ProductPage />} />
        </Route>

        {/* Admin — gated client-side by AdminLayout */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index            element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="login"     element={<AdminLoginPage />} />
          <Route path="dashboard"          element={<AdminDashboardPage />} />
          <Route path="orders"             element={<AdminOrdersPage />} />
          <Route path="contacts"           element={<AdminContactsPage />} />
          <Route path="products"           element={<AdminProductsPage />} />
          <Route path="products/new"       element={<AdminProductFormPage />} />
          <Route path="products/:id/edit"  element={<AdminProductFormPage />} />
          <Route path="portfolio"          element={<AdminPortfolioPage />} />
          <Route path="settings"           element={<AdminSettingsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
    </PortfolioContentProvider>
  );
}
