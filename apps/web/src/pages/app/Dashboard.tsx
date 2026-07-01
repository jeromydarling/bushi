import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card } from '../../components/ui.js';
import { registrationsFeed, tournaments, matSchedule } from '../../lib/demo.js';
import { useSeo } from '../../lib/seo.js';
import { STYLE_LABELS } from '@bushi/domain';

export function Dashboard() {
  useSeo('Console · Bushi');
  const stats = [
    { label: 'Active tournaments', value: '3' },
    { label: 'Registrations (30d)', value: '488' },
    { label: 'Revenue (30d)', value: '$31,720' },
    { label: 'Schools engaged', value: '46' },
  ];
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white not-dark:text-ink-900">Good evening, Rin.</h1>
          <p className="mt-1 text-sm text-ink-400">Here’s what’s happening across your events.</p>
        </div>
        <Button as="link" to="/app/tournaments/new">
          + New tournament
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="font-display text-2xl font-bold text-white not-dark:text-ink-900">{s.value}</div>
            <div className="mt-1 text-xs text-ink-400">{s.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionTitle>Your tournaments</SectionTitle>
          <div className="mt-3 space-y-3">
            {tournaments.map((t) => (
              <Card key={t.id} interactive className="p-5">
                <Link to={`/app/tournaments/${t.id}`} className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white not-dark:text-ink-900">{t.name}</span>
                      <StatusBadge status={t.status} />
                    </div>
                    <div className="mt-1 text-xs text-ink-500">
                      {t.city}, {t.region} · {new Date(t.startDate).toLocaleDateString()} ·{' '}
                      {t.styles.map((s) => STYLE_LABELS[s]).join(', ')}
                    </div>
                  </div>
                  <div className="hidden gap-6 text-right sm:flex">
                    <MiniStat label="Regs" value={t.registrations} />
                    <MiniStat label="Divisions" value={t.divisions} />
                    <MiniStat label="Mats" value={t.mats} />
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <SectionTitle>Live registrations</SectionTitle>
          <Card className="mt-3 divide-y divide-ink-800/70 p-0 not-dark:divide-ink-100">
            {registrationsFeed.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white not-dark:text-ink-900">{r.athlete}</div>
                  <div className="truncate text-xs text-ink-500">{r.division}</div>
                </div>
                <span className="shrink-0 text-xs text-ink-600">{r.when}</span>
              </div>
            ))}
          </Card>

          <SectionTitle className="mt-6">Mats right now</SectionTitle>
          <Card className="mt-3 space-y-2 p-4">
            {matSchedule.map((m) => (
              <Link
                key={m.mat}
                to={`/app/tournaments/tour-summer/mat/${m.mat}`}
                className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-ink-800/50"
              >
                <span className="text-sm text-ink-200 not-dark:text-ink-700">
                  <span className="font-mono text-ink-500">M{m.mat}</span> · {m.division}
                </span>
                {m.status === 'live' ? <Badge tone="live">Live</Badge> : <span className="text-xs text-ink-500">{m.status}</span>}
              </Link>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={`text-xs font-semibold uppercase tracking-[0.18em] text-ink-500 ${className ?? ''}`}>{children}</h2>;
}
function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-display text-lg font-bold text-white not-dark:text-ink-900">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-ink-500">{label}</div>
    </div>
  );
}
export function StatusBadge({ status }: { status: string }) {
  if (status === 'live') return <Badge tone="live">Live</Badge>;
  if (status === 'registration_open') return <Badge tone="success">Registration open</Badge>;
  if (status === 'completed') return <Badge>Completed</Badge>;
  return <Badge tone="accent">{status.replace(/_/g, ' ')}</Badge>;
}
