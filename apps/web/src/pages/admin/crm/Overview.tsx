import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Stat } from '../../../components/ui.js';
import { HealthBar, StageBadge, Notice } from '../../../components/crm.js';
import { api, crmErrorMessage, type CrmOverview } from '../../../lib/api.js';
import { usd } from '../../../lib/cn.js';
import { useSeo } from '../../../lib/seo.js';

export function Overview() {
  useSeo('Retention radar · Bushi CRM');
  const [data, setData] = useState<CrmOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await api.crmOverview();
    setLoading(false);
    if (res.ok) {
      setData(res.data);
      setError(null);
    } else {
      setError(crmErrorMessage(res.status, res.error));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function recomputeAll() {
    setRecomputing(true);
    setNote(null);
    const res = await api.crmRecomputeAll();
    setRecomputing(false);
    if (res.ok) {
      setNote(`Recomputed health — updated ${res.data.updated}, flagged ${res.data.flagged} at-risk.`);
      void load();
    } else {
      setNote(crmErrorMessage(res.status, res.error));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white not-dark:text-ink-900">Retention radar</h1>
          <p className="mt-1 text-sm text-ink-400">Customer health, at-risk accounts and follow-ups at a glance.</p>
        </div>
        <Button variant="secondary" onClick={recomputeAll} disabled={recomputing}>
          {recomputing ? 'Recomputing…' : 'Recompute all health'}
        </Button>
      </div>

      {note && <Notice tone="success">{note}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      {loading && !data && <div className="py-16 text-center text-sm text-ink-500">Loading…</div>}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <Card>
              <Stat label="Customers" value={String(data.tiles.customers)} />
            </Card>
            <Card>
              <Stat label="At-risk" value={String(data.tiles.atRisk)} />
            </Card>
            <Card>
              <Stat label="MRR" value={usd(data.tiles.mrrCents)} />
            </Card>
            <Card>
              <Stat label="At-risk MRR" value={usd(data.tiles.atRiskMrrCents)} />
            </Card>
            <Card>
              <Stat label="Tasks due" value={String(data.tiles.tasksDue)} />
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-0">
              <div className="border-b border-ink-800/80 px-5 py-3 text-sm font-semibold text-white not-dark:border-ink-200 not-dark:text-ink-900">
                At-risk customers
              </div>
              {data.atRiskCustomers.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-ink-500">No at-risk customers — nice.</div>
              ) : (
                <div className="divide-y divide-ink-800/50 not-dark:divide-ink-100">
                  {data.atRiskCustomers.map((c) => (
                    <Link
                      key={c.id}
                      to={`/admin/crm/customers/${c.id}`}
                      className="block px-5 py-4 transition-colors hover:bg-ink-800/40 not-dark:hover:bg-ink-100"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate font-medium text-white not-dark:text-ink-900">{c.name}</span>
                        <StageBadge stage={c.lifecycleStage} />
                      </div>
                      <div className="mt-2">
                        <HealthBar score={c.healthScore} showValue />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-ink-500">
                        <span className="truncate">{c.healthReason ?? 'No reason recorded'}</span>
                        <span className="shrink-0 font-mono text-ink-400">{usd(c.mrrCents)}/mo</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-0">
              <div className="border-b border-ink-800/80 px-5 py-3 text-sm font-semibold text-white not-dark:border-ink-200 not-dark:text-ink-900">
                Follow-ups due
              </div>
              {data.tasksDue.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-ink-500">Nothing due right now.</div>
              ) : (
                <div className="divide-y divide-ink-800/50 not-dark:divide-ink-100">
                  {data.tasksDue.map((t) => (
                    <Link
                      key={t.id}
                      to={`/admin/crm/customers/${t.customer_id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-ink-800/40 not-dark:hover:bg-ink-100"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm text-white not-dark:text-ink-900">{t.title}</div>
                        <div className="truncate text-xs text-ink-500">{t.customer_name}</div>
                      </div>
                      <span className="shrink-0 font-mono text-xs text-ink-400">{formatDue(t.due_at)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function formatDue(due: number | null): string {
  if (!due) return 'No date';
  return new Date(due).toLocaleDateString();
}
