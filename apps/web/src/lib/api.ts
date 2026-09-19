/**
 * Tiny fetch wrapper around the Spring Boot API at apps/api.
 *
 *   VITE_API_URL  — base URL of the backend, e.g. "http://localhost:9090"
 *                   (defaults to "" so the frontend works without a backend too,
 *                    falling back to in-memory data via the catch path below)
 */

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export type ApiError = {
  error: string;
  message: string;
  details?: string[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let payload: ApiError | undefined;
    try { payload = (await res.json()) as ApiError; } catch { /* ignore */ }
    throw Object.assign(new Error(payload?.message ?? res.statusText), {
      status: res.status,
      payload,
    });
  }
  // Some endpoints (202) return JSON, some might not — guard accordingly.
  const ct = res.headers.get('content-type') ?? '';
  return ct.includes('application/json') ? ((await res.json()) as T) : ({} as T);
}

// ---- DTOs (mirror Java records) -----------------------------------

export type ProjectDto = {
  id: number; slug: string; title: string; blurb: string;
  metric: string | null; stack: string[]; accent: string | null;
  repoUrl: string | null; demoUrl: string | null; featured: boolean;
};

export type BlogSummaryDto = {
  id: number; slug: string; title: string; excerpt: string;
  category: string | null; readMin: number | null; publishedAt: string | null;
};

export type ContactPayload = {
  name: string; email: string; company?: string;
  projectType?: string; message: string;
};

// ---- public API ---------------------------------------------------

export const api = {
  health:    () => request<{ status: string; service: string; time: string }>('/api/health'),
  projects:  () => request<ProjectDto[]>('/api/projects'),
  blog:      () => request<BlogSummaryDto[]>('/api/blog'),
  contact:   (payload: ContactPayload) => request<{ id: number; status: string; message: string }>(
                '/api/contact', { method: 'POST', body: JSON.stringify(payload) }),
};

/** Resolve a server-relative asset path (e.g. "/api/store/products/1/images/x.png")
 *  against the configured API base so it works when the frontend is served
 *  from a different origin than the backend. Absolute URLs pass through. */
export function assetUrl(u: string): string {
  return u.startsWith('/api/') ? `${BASE}${u}` : u;
}

/** Whether the env points at a real backend. Useful for graceful fallbacks. */
export const apiConfigured = BASE.length > 0;
