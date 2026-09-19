/**
 * Typed fetch wrapper for the /api/store/* endpoints.
 *
 *   VITE_API_URL drives the base URL (set in .env.local).
 *   Pure-frontend demos work without a backend — see __demoCatalog below.
 */
import { api as baseApi } from '../lib/api';

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try { const j = await res.json(); detail = j.message ?? detail; } catch { /* ignore */ }
    throw Object.assign(new Error(detail), { status: res.status });
  }
  const ct = res.headers.get('content-type') ?? '';
  return ct.includes('application/json') ? ((await res.json()) as T) : ({} as T);
}

/* -------------------- DTOs (mirror Java records) -------------------- */

export type ProductDto = {
  id:           number;
  slug:         string;
  title:        string;
  tagline:      string;
  description:  string;
  category:     string;
  priceInr:     number;
  priceUsd:     number;
  coverColor:   string;        // CSS color used as card accent
  tags:         string[];
  fileSizeMb:   number;
  version:      string;
  demoUrl:      string | null;
  repoUrl:      string | null;
  features:     string[];
  whatYouGet:   string[];
  techStack:    string[];
  featured:     boolean;
  /** True when the product is published on the public catalog (optional — server may omit). */
  published?:   boolean;
  /** Screenshots / demo images (relative URLs). Optional — old clients may omit. */
  demoImages?:  string[];
};

export type OrderRequest = {
  email:          string;
  name:           string;
  items:          { productId: number; quantity: number }[];
  currency:       'INR' | 'USD';
  paymentMethod:  'razorpay' | 'stripe';
  couponCode?:    string;
};

export type OrderResponse = {
  id:                number;
  total:             number;
  currency:          'INR' | 'USD';
  paymentMethod:     string;
  paymentRef:        string;
  status:            'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  downloadToken:     string | null;
  /** Populated for hosted checkout pages (Stripe). Null for Razorpay Checkout.js. */
  paymentRedirectUrl: string | null;
  /** Razorpay public key id — populated only for razorpay orders so
   *  Checkout.js can open the payment modal client-side. */
  razorpayKeyId:      string | null;
  items: { productId: number; title: string; price: number }[];
};

export type DownloadBundleDto = {
  orderId:      number;
  email:        string;
  paidAt:       string;
  expiresAt:    string;
  items: {
    productId: number;
    slug:      string;
    title:     string;
    fileSizeMb: number;
    downloadUrl: string;     // pre-signed URL valid for the token's lifetime
  }[];
};

/* -------------------- Demo catalog fallback -------------------- */

const __demoCatalog: ProductDto[] = [
  {
    id: 1, slug: 'hospital-management-system',
    title: 'Hospital Management System',
    tagline: 'Multi-department hospital OS — OPD, IPD, billing, lab, pharmacy, doctor schedules, patient records.',
    description: 'Full operational stack for clinics and mid-size hospitals. Production-grade auth, role-based access for doctors/nurses/admins/cashiers, lab report uploads, prescription workflow, and a billing module that handles cash, insurance, and corporate clients. Multi-tenant ready out of the box.',
    category: 'Healthcare',
    priceInr: 24999, priceUsd: 299,
    coverColor: '#a855f7',
    tags: ['Spring Boot', 'React', 'PostgreSQL', 'HL7'],
    fileSizeMb: 92, version: '2.1.0',
    demoUrl: null, repoUrl: null,
    features: ['OPD + IPD with bed allocation', 'Doctor scheduling & queue', 'Lab module with report upload', 'In-house pharmacy + inventory', 'Insurance + corporate billing', 'Multi-tenant + role-based access'],
    whatYouGet: ['Complete source (Spring Boot + React)', 'Sample seed for a 30-bed hospital', 'Postman + API docs', 'Setup video walkthrough', 'Email support 60 days'],
    techStack: ['Java 17', 'Spring Boot 3', 'React 18', 'PostgreSQL', 'JWT auth', 'Docker'],
    featured: true,
  },
  {
    id: 2, slug: 'hotel-booking-platform',
    title: 'Hotel Booking Platform',
    tagline: 'Direct-booking engine for boutique hotels — rooms, rates, channel sync, dynamic pricing, payments.',
    description: 'Take direct bookings on your own website instead of paying OTA commissions. Built-in channel sync to Booking.com / Airbnb / MakeMyTrip. Dynamic pricing, seasonal rates, guest profiles, and invoice + GST generation.',
    category: 'Hospitality',
    priceInr: 19999, priceUsd: 249,
    coverColor: '#38bdf8',
    tags: ['Next.js', 'Stripe', 'Postgres', 'Channel API'],
    fileSizeMb: 58, version: '1.4.0',
    demoUrl: null, repoUrl: null,
    features: ['Room inventory + dynamic pricing', 'Channel sync (Booking/Airbnb/MMT)', 'Direct payments (Razorpay + Stripe)', 'Guest profiles + repeat-stay tracking', 'GST-ready invoicing', 'Multi-property support'],
    whatYouGet: ['Complete source', 'Seed for sample 12-room property', 'Channel sync starter kit', 'Setup guide + walkthrough'],
    techStack: ['Next.js 14', 'Node 20', 'PostgreSQL', 'Razorpay', 'Stripe'],
    featured: true,
  },
  {
    id: 3, slug: 'pharmacy-management-system',
    title: 'Pharmacy Management System',
    tagline: 'Retail-pharmacy POS — inventory, batch + expiry tracking, prescription upload, GST invoices.',
    description: 'Built for Indian retail pharmacies. Batch-and-expiry inventory, prescription image upload + retrieval, GST-ready invoicing, supplier purchase orders, and a customer profile for repeat prescriptions.',
    category: 'Healthcare',
    priceInr: 14999, priceUsd: 179,
    coverColor: '#10b981',
    tags: ['React', 'Spring Boot', 'PostgreSQL', 'Barcode'],
    fileSizeMb: 44, version: '1.3.0',
    demoUrl: null, repoUrl: null,
    features: ['Batch + expiry tracking', 'Barcode scanner support', 'Prescription image upload', 'GST-compliant invoicing', 'Supplier purchase orders', 'Customer profile + repeat Rx'],
    whatYouGet: ['Complete source', 'Sample drug master CSV', 'Setup guide', 'Email support 30 days'],
    techStack: ['React', 'Spring Boot 3', 'PostgreSQL', 'Tailwind'],
    featured: true,
  },
  {
    id: 4, slug: 'salon-spa-management',
    title: 'Salon & Spa Management',
    tagline: 'Booking + staff schedules + service catalog for salons and spas. WhatsApp reminders included.',
    description: 'Front-desk workflow for salons and spas — staff schedules, service catalog with packages, WhatsApp reminders, walk-in queue, and a customer profile that tracks preferences and stylist history.',
    category: 'Business Tools',
    priceInr: 7999, priceUsd: 99,
    coverColor: '#ec4899',
    tags: ['React', 'Node', 'PostgreSQL', 'WhatsApp'],
    fileSizeMb: 32, version: '1.0.2',
    demoUrl: null, repoUrl: null,
    features: ['Staff scheduling + commission tracking', 'Service catalog with packages', 'WhatsApp + SMS reminders', 'Walk-in queue management', 'Customer profile + visit history', 'Daily/weekly reports'],
    whatYouGet: ['Complete source code', 'Sample salon seed data', 'WhatsApp setup guide', 'Setup video walkthrough'],
    techStack: ['React', 'Node 20', 'PostgreSQL', 'Twilio WhatsApp'],
    featured: true,
  },
  {
    id: 5, slug: 'appointment-booking-engine',
    title: 'Appointment Booking Engine',
    tagline: 'Plug-and-play appointment booking — clinics, consultants, coaches, beauticians.',
    description: 'A clean booking widget you can drop into any site. Calendar sync (Google + iCal), Twilio reminders, no-show flagging, configurable buffer time, and payment-on-booking via Razorpay/Stripe.',
    category: 'Business Tools',
    priceInr: 4999, priceUsd: 59,
    coverColor: '#fbbf24',
    tags: ['Next.js', 'iCal', 'Twilio', 'Postgres'],
    fileSizeMb: 18, version: '1.2.0',
    demoUrl: null, repoUrl: null,
    features: ['Drop-in booking widget', 'Google + iCal calendar sync', 'Twilio SMS + WhatsApp reminders', 'No-show flagging', 'Pay-on-booking (Razorpay/Stripe)', 'Buffer time + lunch breaks'],
    whatYouGet: ['Complete source', 'Embed snippets (React/HTML)', 'Setup guide', 'Email support 30 days'],
    techStack: ['Next.js 14', 'PostgreSQL', 'Twilio', 'Razorpay'],
    featured: true,
  },
  {
    id: 6, slug: 'invoice-gst-management',
    title: 'Invoice & GST Management',
    tagline: 'Invoicing for Indian SMEs — GST-compliant, e-invoice IRN, recurring billing, payment match.',
    description: 'Generate GST-compliant invoices, e-invoice IRNs via the official IRP, and reconcile incoming payments automatically. Built around the workflow of a small accountancy practice.',
    category: 'Business Tools',
    priceInr: 6999, priceUsd: 79,
    coverColor: '#60a5fa',
    tags: ['React', 'Spring Boot', 'GST API'],
    fileSizeMb: 24, version: '2.0.1',
    demoUrl: null, repoUrl: null,
    features: ['GST-compliant invoices (B2B/B2C)', 'E-invoice IRN via IRP', 'Recurring + retainer billing', 'Payment reconciliation', 'Vendor master + TDS handling', 'Tally / Zoho Books export'],
    whatYouGet: ['Complete source', 'GST rate master', 'IRP integration guide', 'Setup video'],
    techStack: ['React', 'Spring Boot', 'PostgreSQL', 'GST IRP'],
    featured: true,
  },
  {
    id: 8, slug: 'cafe-pos',
    title: 'Sugar & Spice Café POS',
    tagline: 'POS + inventory + CRM automation built for my own café. Battle-tested in production.',
    description: 'Tablet-friendly POS, automated inventory thresholds, lightweight customer CRM. Owner-operator product — just the source code, no SaaS lock-in.',
    category: 'Business Tools',
    priceInr: 9999, priceUsd: 129,
    coverColor: '#10b981',
    tags: ['React', 'Node', 'PostgreSQL', 'POS'],
    fileSizeMb: 41, version: '1.0.4',
    demoUrl: null, repoUrl: null,
    features: ['Tablet-first POS UI', 'Inventory thresholds + reorder alerts', 'Customer CRM', 'Daily/weekly reports', 'Offline-tolerant transactions'],
    whatYouGet: ['Complete source code', 'Sample seed for a café', 'PDF receipt template', 'Setup guide', 'Email support 30 days'],
    techStack: ['React', 'Node 20', 'PostgreSQL', 'Tailwind'],
    featured: false,
  },
  {
    id: 9, slug: 'autoscalp-bot',
    title: 'AutoScalp Trading Bot',
    tagline: 'Algorithmic options-scalping engine for the Indian equity market.',
    description: 'Low-latency Java + WebSocket order routing. Parameter-sweep backtesting + walk-forward validation. Bring your own broker credentials.',
    category: 'Trading & Quant',
    priceInr: 14999, priceUsd: 199,
    coverColor: '#fbbf24',
    tags: ['Java', 'Spring WebFlux', 'Redis', 'TimescaleDB'],
    fileSizeMb: 64, version: '2.5.0',
    demoUrl: null, repoUrl: null,
    features: ['Order routing under 20ms p99', 'Parameter-sweep backtesting harness', 'Walk-forward validation', 'Kite Connect broker adapter', 'Web UI with real-time P&L'],
    whatYouGet: ['Complete source', 'Backtest data sample (3 mo)', 'Strategy presets', 'Setup video walkthrough'],
    techStack: ['Java 17', 'Spring WebFlux', 'React', 'Redis', 'TimescaleDB'],
    featured: false,
  },
  {
    id: 10, slug: 'workiva-toolkit',
    title: 'Workiva Integration Toolkit',
    tagline: 'Reusable Java connectors for Salesforce ↔ Wdesk, audit trail, scheduled refresh.',
    description: 'The connectors I built across multiple Workiva rollouts, packaged. SOX-friendly audit trail out of the box.',
    category: 'Enterprise',
    priceInr: 19999, priceUsd: 249,
    coverColor: '#38bdf8',
    tags: ['Workiva', 'Salesforce', 'Java', 'AWS Lambda'],
    fileSizeMb: 22, version: '3.0.1',
    demoUrl: null, repoUrl: null,
    features: ['Salesforce → Wdesk sync', 'Scheduled refresh via Lambda', 'Audit trail (SOX-friendly)', 'Configurable column mapping', 'Connector unit-test fixtures'],
    whatYouGet: ['Complete source', 'Workiva API client', 'Salesforce client', 'Setup videos'],
    techStack: ['Java 17', 'Spring Boot', 'AWS Lambda', 'Salesforce API', 'Workiva SDK'],
    featured: false,
  },
];

/**
 * `apiConfigured` used to control whether we hit the backend at all. Kept as
 * an export for CheckoutPage/DownloadsPage which still need to know if a
 * real backend is wired (payment flow requires it). BUT for GET catalog /
 * product endpoints we ALWAYS try the network first now — even when
 * VITE_API_URL is blank, the Vite dev proxy forwards /api/* to :9090, so
 * skipping the fetch would hide real DB content behind the demo catalog.
 * Fall back to demo only on a genuine network error.
 */
export const apiConfigured = BASE.length > 0;

/** True when the error looks like the backend simply isn't reachable — not
 *  when it responded with a 4xx/5xx status. We only fall back to the demo
 *  catalog for the former; real HTTP errors must surface to the caller. */
function isNetworkError(e: unknown): boolean {
  if (typeof (e as { status?: number })?.status === 'number') return false;
  return e instanceof TypeError; // fetch throws TypeError for network failure
}

/* -------------------- Public API -------------------- */

export const store = {
  async list(): Promise<ProductDto[]> {
    try { return await req<ProductDto[]>('/api/store/products'); }
    catch (e) {
      if (isNetworkError(e)) return __demoCatalog;
      throw e;
    }
  },
  async one(slug: string): Promise<ProductDto | null> {
    try { return await req<ProductDto>(`/api/store/products/${slug}`); }
    catch (e) {
      // 404 means "this product does not exist" — do NOT paper over with demo data.
      if ((e as { status?: number })?.status === 404) return null;
      if (isNetworkError(e)) return __demoCatalog.find((p) => p.slug === slug) ?? null;
      throw e;
    }
  },
  createOrder(body: OrderRequest) {
    return req<OrderResponse>('/api/store/orders', { method: 'POST', body: JSON.stringify(body) });
  },
  /**
   * Mock-confirm. Backend now requires the buyer's email in the body — the
   * value must match the order's email or the server returns 403.
   */
  confirmMockPayment(orderId: number, email: string) {
    return req<OrderResponse>(`/api/store/orders/${orderId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  getOrder(orderId: number, email?: string) {
    const q = email ? `?email=${encodeURIComponent(email)}` : '';
    return req<OrderResponse>(`/api/store/orders/${orderId}${q}`);
  },
  getDownloads(token: string) {
    return req<DownloadBundleDto>(`/api/store/downloads/${token}`);
  },
};

// keep portfolio contact API accessible from the store nav (for "Talk to me" CTAs)
export { baseApi };
