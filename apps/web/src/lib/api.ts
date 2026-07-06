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
  discover: (params: string) => request<{ results: DiscoverItem[] }>(`/api/public/discover?${params}`),
  discoverWeb: (q: string) => request<{ results: DiscoverItem[]; found?: number }>(`/api/public/discover/web?q=${encodeURIComponent(q)}`),
  discoveryRefresh: () =>
    request<{ ok: boolean; found: number; inserted: number; updated: number }>('/api/admin/discovery/refresh', { method: 'POST' }),
  discoveryRuns: () => request<{ runs: DiscoveryRun[] }>('/api/admin/discovery/runs'),
  plans: () => request<{ tiers: Array<{ tier: string; monthlyCents: number; annualCents: number }> }>('/api/billing/plans'),

  // ── CRM (super-admin) ─────────────────────────────────────────────────────
  crmOverview: () => request<CrmOverview>('/api/admin/crm/overview'),
  crmMap: () => request<{ points: CrmMapPoint[] }>('/api/admin/crm/map'),
  crmCustomers: (params?: string) =>
    request<{ customers: CustomerSummary[] }>(`/api/admin/crm/customers${params ? `?${params}` : ''}`),
  crmCustomer: (id: string) => request<CustomerDetail>(`/api/admin/crm/customers/${id}`),
  crmUpdateCustomer: (id: string, body: CrmCustomerPatch) =>
    request<{ ok: boolean }>(`/api/admin/crm/customers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  crmAddInteraction: (id: string, body: CrmInteractionInput) =>
    request<{ ok: boolean; id: string; emailed: boolean }>(`/api/admin/crm/customers/${id}/interactions`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  crmAddTask: (id: string, body: { title: string; dueAt?: number }) =>
    request<{ ok: boolean; id: string }>(`/api/admin/crm/customers/${id}/tasks`, { method: 'POST', body: JSON.stringify(body) }),
  crmUpdateTask: (id: string, body: { status: 'open' | 'done' }) =>
    request<{ ok: boolean }>(`/api/admin/crm/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  crmAddTicket: (id: string, body: { subject: string; body?: string; priority?: TicketPriority }) =>
    request<{ ok: boolean; id: string }>(`/api/admin/crm/customers/${id}/tickets`, { method: 'POST', body: JSON.stringify(body) }),
  crmUpdateTicket: (id: string, body: { status: TicketStatus }) =>
    request<{ ok: boolean }>(`/api/admin/crm/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  crmRecomputeHealth: (id: string) =>
    request<CrmHealth>(`/api/admin/crm/customers/${id}/health/recompute`, { method: 'POST' }),
  crmRecomputeAll: () =>
    request<{ ok: boolean; updated: number; flagged: number }>('/api/admin/crm/recompute-all', { method: 'POST' }),
};

// ── CRM types ────────────────────────────────────────────────────────────────

export type LifecycleStage = 'trial' | 'onboarding' | 'active' | 'at_risk' | 'churned' | 'won_back';
export type InteractionKind = 'note' | 'call' | 'email' | 'meeting';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed';

export interface CustomerSummary {
  id: string;
  orgId: string | null;
  name: string;
  lifecycleStage: string;
  healthScore: number;
  healthReason: string | null;
  mrrCents: number;
  ownerName: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  tags: string[];
  atRisk: boolean;
}

export interface CrmTaskDue {
  id: string;
  title: string;
  due_at: number | null;
  status: string;
  customer_id: string;
  customer_name: string;
}

export interface CrmOverview {
  tiles: { customers: number; atRisk: number; mrrCents: number; atRiskMrrCents: number; tasksDue: number };
  atRiskCustomers: CustomerSummary[];
  tasksDue: CrmTaskDue[];
}

export interface CrmMapPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  stage: string;
  healthScore: number;
  mrrCents: number;
  atRisk: boolean;
}

export interface CrmContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  is_primary: number;
}

export interface CrmInteraction {
  id: string;
  kind: string;
  subject: string | null;
  body: string;
  follow_up_at: number | null;
  created_at: number;
  author_name: string | null;
}

export interface CrmTask {
  id: string;
  title: string;
  due_at: number | null;
  status: string;
  source: string;
  created_at: number;
}

export interface CrmTicket {
  id: string;
  subject: string;
  body: string | null;
  status: string;
  priority: string;
  created_at: number;
}

export interface CrmHealthFactor {
  label: string;
  value: number;
}

export interface CrmHealth {
  score: number;
  reason: string;
  factors: CrmHealthFactor[];
}

export interface CrmHealthTrendPoint {
  score: number;
  created_at: number;
}

export interface CustomerDetail {
  customer: CustomerSummary;
  contacts: CrmContact[];
  interactions: CrmInteraction[];
  tasks: CrmTask[];
  tickets: CrmTicket[];
  health: CrmHealth;
  healthTrend: CrmHealthTrendPoint[];
}

export interface CrmCustomerPatch {
  lifecycleStage?: LifecycleStage;
  ownerUserId?: string;
  mrrCents?: number;
  tags?: string[];
  lat?: number;
  lng?: number;
}

export interface CrmInteractionInput {
  kind: InteractionKind;
  subject?: string;
  body: string;
  followUpAt?: number;
}

/** Maps an ApiResult failure to a friendly, degrade-gracefully message. */
export function crmErrorMessage(status: number, error: string): string {
  if (status === 0) return 'Connect the API (VITE_API_BASE) to load CRM data.';
  if (status === 401 || status === 403) return 'Sign in as a platform admin.';
  return error;
}

export interface DiscoveryRun {
  trigger: string;
  query: string | null;
  found: number;
  inserted: number;
  updated: number;
  status: string;
  error: string | null;
  created_at: number;
}

/** Unified discovery item (Bushi-hosted or web-discovered). */
export interface DiscoverItem {
  id: string;
  source: 'bushi' | 'web';
  name: string;
  slug: string | null;
  styles: string[];
  startDate: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  status: string | null;
  sourceUrl: string | null;
}
