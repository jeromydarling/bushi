/**
 * Typed client for the Bushi Worker API. Uses an env-driven base URL so the SPA
 * can run against a local `wrangler dev` or a deployed Worker. Every call fails
 * soft (returns { ok: false }) so demo screens never crash without a backend.
 */
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

export const WS_BASE = (() => {
  if (import.meta.env.VITE_API_BASE) {
    return (import.meta.env.VITE_API_BASE as string).replace(/^http/, 'ws');
  }
  if (typeof location !== 'undefined') {
    return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
  }
  return 'ws://localhost:8787';
})();

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
      ...init,
    });
    const body = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) return { ok: false, error: body.error ?? res.statusText, status: res.status };
    return { ok: true, data: body as T };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error', status: 0 };
  }
}

export const api = {
  signup: (body: { email: string; password: string; fullName: string }) =>
    request<{ user: { id: string; email: string }; orgId: string }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    request<{ user: { id: string; email: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  me: () => request<{ id: string; email: string; roles: string[] }>('/api/auth/me'),
  createTournament: (body: unknown) =>
    request<{ tournament: unknown }>('/api/tournaments', { method: 'POST', body: JSON.stringify(body) }),
  discover: (params: string) => request<{ tournaments: unknown[] }>(`/api/public/discover?${params}`),
  plans: () => request<{ tiers: Array<{ tier: string; monthlyCents: number; annualCents: number }> }>('/api/billing/plans'),
};
