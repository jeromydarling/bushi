import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../../components/ui.js';
import { HealthBar, StageBadge, Notice, locationText } from '../../../components/crm.js';
import { api, crmErrorMessage, type CustomerSummary, type LifecycleStage } from '../../../lib/api.js';
import { usd, cn } from '../../../lib/cn.js';
import { useSeo } from '../../../lib/seo.js';

const STAGES: Array<{ value: LifecycleStage | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'trial', label: 'Trial' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'active', label: 'Active' },
  { value: 'at_risk', label: 'At risk' },
  { value: 'churned', label: 'Churned' },
  { value: 'won_back', label: 'Won back' },
];

export function Customers() {
  useSeo('Customers · Bushi CRM');
  const [q, setQ] = useState('');
  const [stage, setStage] = useState<LifecycleStage | 'all'>('all');
  const [riskOnly, setRiskOnly] = useState(false);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (stage !== 'all') params.set('stage', stage);
    if (riskOnly) params.set('risk', '1');
    const t = setTimeout(() => {
      api.crmCustomers(params.toString()).then((res) => {
        if (cancelled) return;
        setLoading(false);
        if (res.ok) {
          setCustomers(res.data.customers);
          setError(null);
        } else {
          setError(crmErrorMessage(res.status, res.error));
        }
      });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, stage, riskOnly]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white not-dark:text-ink-900">Customers</h1>
        <p className="mt-1 text-sm text-ink-400">Search, filter and drill into every account.</p>
      </div>

      <div className="space-y-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search customers"
          placeholder="Search customers…"
          className="w-full rounded-lg border border-ink-700 bg-ink-900 px-4 py-2.5 text-sm text-white not-dark:border-ink-200 not-dark:bg-white not-dark:text-ink-900"
        />
        <div className="flex flex-wrap items-center gap-2">
          {STAGES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStage(s.value)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                stage === s.value
                  ? 'border-kiai-500/50 bg-kiai-500/10 text-kiai-300'
                  : 'border-ink-800 text-ink-400 hover:text-white not-dark:border-ink-200 not-dark:hover:text-ink-900',
              )}
            >
              {s.label}
            </button>
          ))}
          <button
            onClick={() => setRiskOnly((v) => !v)}
            className={cn(
              'ml-auto rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              riskOnly
                ? 'border-red-500/50 bg-red-500/10 text-red-300'
                : 'border-ink-800 text-ink-400 hover:text-white not-dark:border-ink-200 not-dark:hover:text-ink-900',
            )}
          >
            At-risk only
          </button>
        </div>
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <Card className="p-0">
        <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_auto_auto_minmax(0,1.2fr)] gap-4 border-b border-ink-800/80 px-5 py-3 text-xs font-medium uppercase tracking-wide text-ink-500 not-dark:border-ink-200 md:grid">
          <span>Customer</span>
          <span>Health</span>
          <span>Stage</span>
          <span>MRR</span>
          <span>Owner · Location</span>
        </div>
        {loading && customers.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-ink-500">Loading…</div>
        ) : customers.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-ink-500">No customers match those filters.</div>
        ) : (
          <div className="divide-y divide-ink-800/50 not-dark:divide-ink-100">
            {customers.map((c) => (
              <Link
                key={c.id}
                to={`/admin/crm/customers/${c.id}`}
                className="grid grid-cols-1 gap-2 px-5 py-4 transition-colors hover:bg-ink-800/40 not-dark:hover:bg-ink-100 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_auto_auto_minmax(0,1.2fr)] md:items-center md:gap-4"
              >
                <span className="truncate font-medium text-white not-dark:text-ink-900">{c.name}</span>
                <div className="md:w-full">
                  <HealthBar score={c.healthScore} showValue />
                </div>
                <StageBadge stage={c.lifecycleStage} />
                <span className="font-mono text-sm text-ink-300 not-dark:text-ink-600">{usd(c.mrrCents)}</span>
                <span className="truncate text-xs text-ink-500">
                  {c.ownerName ?? 'Unassigned'} · {locationText(c.city, c.region, c.country)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
