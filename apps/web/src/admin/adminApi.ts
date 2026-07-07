/**
 * Typed fetch wrapper for /api/admin/*.
 *
 *   Stores the session token in localStorage and adds an
 *   Authorization: Bearer <token> header to every request.
 *
 *   Note: the public site polls /api/portfolio every 5s, so saves here
 *   reflect on the public site within 5s automatically. No cross-tab
 *   broadcast needed.
 */
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
const TOKEN_KEY = 'portfolio-admin-token';

/** Fire-and-forget push to any public tab that a product just changed. */
function notifyStore(key?: string): void {
  import('../lib/portfolioBus')
    .then(({ notifyStoreChanged }) => notifyStoreChanged(key))
    .catch(() => { /* module missing — public polling still catches it */ });
}

export type AdminStats = {
  totalProducts:     number;
  publishedProducts: number;
  totalOrders:       number;
  paidOrders:        number;
  totalRevenueInr:   number;
  totalContacts:     number;
  newContacts:       number;
};

export type AdminOrder = {
  id:             number;
  total:          number;
  currency:       string;
  paymentMethod:  string;
  paymentRef:     string;
  status:         string;
  downloadToken:  string | null;
  items:          { productId: number; title: string; price: number }[];
};

export type AdminContact = {
  id:           number;
  name:         string;
  email:        string;
  company:      string | null;
  projectType:  string | null;
  message:      string;
  status:       string;
  createdAt:    string;
};

export type AdminProduct = {
  id:           number;
  slug:         string;
  title:        string;
  tagline:      string;
  description:  string;
  category:     string;
  priceInr:     number;
  priceUsd:     number;
  coverColor:   string;
  tags:         string[];
  fileSizeMb:   number;
  version:      string;
  demoUrl:      string | null;
  repoUrl:      string | null;
  features:     string[];
  whatYouGet:   string[];
  techStack:    string[];
  featured:     boolean;
  /** Server may omit this from /api/store/products responses; admin payloads include it. */
  published?:   boolean;
  /** Relative URLs the client can render as <img src>. */
  demoImages?:  string[];
};

export const adminToken = {
  get(): string | null { return localStorage.getItem(TOKEN_KEY); },
  set(t: string)       { localStorage.setItem(TOKEN_KEY, t); },
  clear()              { localStorage.removeItem(TOKEN_KEY); },
};

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = adminToken.get();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  // 401 handling has two distinct cases:
  //   - Login endpoint (or any request WITHOUT a token): the credentials
  //     just failed — surface the server's error message ("Email or
  //     password is incorrect.") so the user knows to retry.
  //   - Authenticated request WITH a token: the token no longer works —
  //     THAT is a real session expiry; wipe local state so guards route
  //     back to /admin/login next tick.
  if (res.status === 401) {
    const isLogin = path === '/api/admin/login';
    if (!token || isLogin) {
      let serverMsg = 'Email or password is incorrect.';
      try { const j = await res.json(); serverMsg = j.message ?? serverMsg; } catch { /* ignore */ }
      throw Object.assign(new Error(serverMsg), { status: 401 });
    }
    adminToken.clear();
    throw Object.assign(new Error('Session expired. Please sign in again.'), { status: 401 });
  }
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = j.message ?? msg; } catch { /* ignore */ }
    throw Object.assign(new Error(msg), { status: res.status });
  }
  const ct = res.headers.get('content-type') ?? '';
  return ct.includes('application/json') ? ((await res.json()) as T) : ({} as T);
}

export const adminApi = {
  async login(email: string, password: string) {
    const r = await req<{ token: string; email: string; expiresInMin: number }>(
      '/api/admin/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    );
    adminToken.set(r.token);
    return r;
  },
  async logout() {
    try { await req('/api/admin/logout', { method: 'POST' }); }
    finally { adminToken.clear(); }
  },
  stats()    { return req<AdminStats>('/api/admin/stats'); },
  orders()   { return req<AdminOrder[]>('/api/admin/orders?limit=200'); },
  contacts() { return req<AdminContact[]>('/api/admin/contacts?limit=200'); },
  products() { return req<AdminProduct[]>('/api/admin/products'); },
  updateOrderStatus(id: number, status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED') {
    return req<AdminOrder>(`/api/admin/orders/${id}/status`,
      { method: 'PUT', body: JSON.stringify({ status }) });
  },
  updateContactStatus(id: number, status: 'NEW' | 'REPLIED' | 'ARCHIVED' | 'SPAM') {
    return req<AdminContact>(`/api/admin/contacts/${id}/status`,
      { method: 'PUT', body: JSON.stringify({ status }) });
  },
  product(id: number) { return req<AdminProduct>(`/api/admin/products/${id}`); },
  async createProduct(body: Partial<Record<string, unknown>>) {
    const r = await req<AdminProduct>('/api/admin/products',
      { method: 'POST', body: JSON.stringify(body) });
    notifyStore(String(r.id));
    return r;
  },
  async updateProduct(id: number, patch: Partial<Record<string, unknown>>) {
    const r = await req<AdminProduct>(`/api/admin/products/${id}`,
      { method: 'PUT', body: JSON.stringify(patch) });
    notifyStore(String(id));
    return r;
  },
  async deleteProduct(id: number) {
    await req<void>(`/api/admin/products/${id}`, { method: 'DELETE' });
    notifyStore(String(id));
  },

  /** Multipart upload of the product source ZIP. Reports progress 0..100. */
  async uploadAsset(productId: number, file: File, onProgress?: (pct: number) => void) {
    const token = adminToken.get();
    const r = await new Promise<{ ok: boolean; fileName: string; fileSizeMb: number }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE}/api/admin/products/${productId}/asset`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch { reject(new Error('Bad upload response')); }
        } else {
          reject(new Error(xhr.responseText || xhr.statusText));
        }
      };
      xhr.onerror = () => reject(new Error('Upload failed'));
      const form = new FormData();
      form.append('file', file);
      xhr.send(form);
    });
    notifyStore(String(productId));
    return r;
  },
  async removeAsset(productId: number) {
    await req<void>(`/api/admin/products/${productId}/asset`, { method: 'DELETE' });
    notifyStore(String(productId));
  },

  /**
   * Multipart upload of a demo/screenshot image (JPG/PNG/WebP/GIF, ≤ 8 MB).
   * Returns the updated product so the caller can refresh its gallery state.
   */
  async uploadProductImage(productId: number, file: File, onProgress?: (pct: number) => void) {
    const token = adminToken.get();
    const r = await new Promise<{ ok: boolean; fileName: string; product: AdminProduct }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE}/api/admin/products/${productId}/images`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch { reject(new Error('Bad upload response')); }
        } else {
          reject(new Error(xhr.responseText || xhr.statusText));
        }
      };
      xhr.onerror = () => reject(new Error('Upload failed'));
      const form = new FormData();
      form.append('file', file);
      xhr.send(form);
    });
    notifyStore(String(productId));
    return r;
  },
  async deleteProductImage(productId: number, filename: string) {
    const r = await req<{ ok: boolean; product: AdminProduct }>(
      `/api/admin/products/${productId}/images/${encodeURIComponent(filename)}`,
      { method: 'DELETE' });
    notifyStore(String(productId));
    return r;
  },

  /* ---------- Profile CV ---------- */
  cvStatus() {
    return req<{ exists: boolean; sizeBytes?: number; updatedAt?: string }>(
      '/api/admin/profile/cv/status');
  },
  async uploadCv(file: File, onProgress?: (pct: number) => void) {
    const token = adminToken.get();
    const r = await new Promise<{ ok: boolean; url: string; sizeBytes: number }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE}/api/admin/profile/cv`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch { reject(new Error('Bad upload response')); }
        } else {
          reject(new Error(xhr.responseText || xhr.statusText));
        }
      };
      xhr.onerror = () => reject(new Error('Upload failed'));
      const form = new FormData();
      form.append('file', file);
      xhr.send(form);
    });
    // Backend also patched profile.cvUrl — nudge the public tab to refetch.
    try {
      const { notifyPortfolioChanged } = await import('../lib/portfolioBus');
      notifyPortfolioChanged('profile');
    } catch { /* ignore */ }
    return r;
  },
  async removeCv() {
    const r = await req<{ ok: boolean }>('/api/admin/profile/cv', { method: 'DELETE' });
    try {
      const { notifyPortfolioChanged } = await import('../lib/portfolioBus');
      notifyPortfolioChanged('profile');
    } catch { /* ignore */ }
    return r;
  },

  /* ---------- Portfolio CMS ---------- */
  listSections() {
    return req<{ key: string; label: string; body: unknown; updatedAt: string }[]>('/api/admin/portfolio');
  },
  async updateSection(key: string, body: unknown, label?: string) {
    const res = await req<{ key: string; label: string; body: unknown }>(
      `/api/admin/portfolio/${key}`,
      { method: 'PUT', body: JSON.stringify({ key, label, body }) },
    );
    try {
      const { notifyPortfolioChanged } = await import('../lib/portfolioBus');
      notifyPortfolioChanged(key);
    } catch { /* module not present — polling still catches the change */ }
    return res;
  },
  /**
   * Create a brand-new CMS section. `key` becomes the URL slug the public
   * site reads at `/api/portfolio/{key}` and must match
   * `^[a-zA-Z0-9._-]+$` (enforced server-side).
   */
  async createSection(key: string, label: string, body: unknown) {
    const res = await req<{ key: string; label: string; body: unknown }>(
      '/api/admin/portfolio',
      { method: 'POST', body: JSON.stringify({ key, label, body }) },
    );
    try {
      const { notifyPortfolioChanged } = await import('../lib/portfolioBus');
      notifyPortfolioChanged(key);
    } catch { /* ignore */ }
    return res;
  },
  /** Delete a CMS section. The public site falls back to the built-in
   *  default (see apps/web/src/lib/data.ts) when the row is gone. */
  async deleteSection(key: string) {
    await req<void>(`/api/admin/portfolio/${encodeURIComponent(key)}`, { method: 'DELETE' });
    try {
      const { notifyPortfolioChanged } = await import('../lib/portfolioBus');
      notifyPortfolioChanged(key);
    } catch { /* ignore */ }
  },

  /* ---------- Settings (key/value config) ---------- */
  listSettings() {
    return req<AdminSettingRow[]>('/api/admin/settings');
  },
  updateSetting(key: string, value: string) {
    return req<AdminSettingRow>(`/api/admin/settings/${encodeURIComponent(key)}`,
      { method: 'PUT', body: JSON.stringify({ value }) });
  },
};

export type AdminSettingRow = {
  key:         string;
  category:    string;
  label:       string;
  description: string | null;
  value:       string;    // masked for secrets
  isSecret:    boolean;
  hasValue:    boolean;
  updatedAt:   string;
};
