import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { STYLE_LABELS } from '@bushi/domain';
import { Badge, Button, Card } from '../../components/ui.js';
import { StatusBadge } from './Dashboard.js';
import { athletes, matSchedule, registrationsFeed, tournaments } from '../../lib/demo.js';
import { cn } from '../../lib/cn.js';
import { useSeo } from '../../lib/seo.js';

const tabs = ['Overview', 'Divisions', 'Schedule', 'Registrations', 'Mats', 'Announcements'] as const;

export function TournamentDetail() {
  const { id } = useParams();
  const t = tournaments.find((x) => x.id === id) ?? tournaments[0]!;
  useSeo(`${t.name} · Bushi`);
  const [tab, setTab] = useState<(typeof tabs)[number]>('Overview');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-white not-dark:text-ink-900">{t.name}</h1>
            <StatusBadge status={t.status} />
          </div>
          <p className="mt-1 text-sm text-ink-400">
            {t.city}, {t.region} · {new Date(t.startDate).toLocaleDateString()} ·{' '}
            {t.styles.map((s) => STYLE_LABELS[s]).join(', ')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button as="link" to={`/t/${t.slug}`} variant="secondary" size="sm">
            Public page
          </Button>
          <Button size="sm">Publish</Button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-ink-800/80 not-dark:border-ink-200">
        {tabs.map((x) => (
          <button
            key={x}
            onClick={() => setTab(x)}
            className={cn(
              'whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              tab === x
                ? 'border-kiai-500 text-white not-dark:text-ink-900'
                : 'border-transparent text-ink-400 hover:text-white not-dark:hover:text-ink-900',
            )}
          >
            {x}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            ['Registrations', t.registrations],
            ['Divisions', t.divisions],
            ['Mats', t.mats],
            ['Check-ins', Math.round(t.registrations * 0.72)],
          ].map(([label, value]) => (
            <Card key={label as string} className="p-5">
              <div className="font-display text-2xl font-bold text-white not-dark:text-ink-900">{value}</div>
              <div className="mt-1 text-xs text-ink-400">{label}</div>
            </Card>
          ))}
          <Card className="sm:col-span-4">
            <h3 className="text-sm font-semibold text-white not-dark:text-ink-900">AI organizer assistant</h3>
            <p className="mt-1 text-sm text-ink-400">Ask about divisions, schedules, or draft a reminder to all schools.</p>
            <div className="mt-3 flex gap-2">
              <input className="flex-1 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-white not-dark:border-ink-200 not-dark:bg-white not-dark:text-ink-900" placeholder="Draft a last-chance email to registered schools…" />
              <Button size="sm">Ask</Button>
            </div>
          </Card>
        </div>
      )}

      {tab === 'Divisions' && (
        <Card className="p-0">
          <Table
            head={['Division', 'Style', 'Entries', 'Status', '']}
            rows={['Adult Purple -76kg', 'Adult Blue -61kg', 'Junior -57kg', 'Open Kumite'].map((d, i) => [
              d,
              STYLE_LABELS[t.styles[i % t.styles.length]!],
              String(6 + i * 2),
              i === 0 ? 'Seeded' : 'Open',
              <Button key={d} as="link" to={`/app/tournaments/${t.id}/mat/${(i % t.mats) + 1}`} size="sm" variant="ghost">Score</Button>,
            ])}
          />
        </Card>
      )}

      {tab === 'Schedule' && (
        <Card className="space-y-2 p-4">
          {matSchedule.map((m) => (
            <Link key={m.mat} to={`/app/tournaments/${t.id}/mat/${m.mat}`} className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-ink-800/50">
              <span className="text-sm text-ink-200 not-dark:text-ink-700"><span className="font-mono text-ink-500">Mat {m.mat}</span> · {m.division} — {m.match}</span>
              {m.status === 'live' ? <Badge tone="live">Live</Badge> : <span className="text-xs text-ink-500">{m.status}</span>}
            </Link>
          ))}
        </Card>
      )}

      {tab === 'Registrations' && (
        <Card className="p-0">
          <Table
            head={['Athlete', 'School', 'Division', 'When']}
            rows={registrationsFeed.map((r) => [r.athlete, r.school, r.division, r.when])}
          />
        </Card>
      )}

      {tab === 'Mats' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: t.mats }, (_, i) => (
            <Link key={i} to={`/app/tournaments/${t.id}/mat/${i + 1}`}>
              <Card interactive className="text-center">
                <div className="font-mono text-xs text-ink-500">MAT</div>
                <div className="font-display text-4xl font-bold text-white not-dark:text-ink-900">{i + 1}</div>
                {i < 2 ? <Badge tone="live">Live</Badge> : <span className="text-xs text-ink-500">idle</span>}
              </Card>
            </Link>
          ))}
        </div>
      )}

      {tab === 'Announcements' && (
        <Card>
          <h3 className="text-sm font-semibold text-white not-dark:text-ink-900">Post an announcement</h3>
          <input className="mt-3 w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-white not-dark:border-ink-200 not-dark:bg-white not-dark:text-ink-900" placeholder="Mat 3 divisions starting in 15 minutes" />
          <Button size="sm" className="mt-3">Publish to spectators</Button>
          <div className="mt-4 space-y-2 border-t border-ink-800/60 pt-4 text-sm text-ink-400 not-dark:border-ink-100">
            <p>· Check-in closes at 9:30 AM sharp.</p>
            <p>· Bracket updates are live on the public results page.</p>
          </div>
        </Card>
      )}

      <p className="text-xs text-ink-600">Athlete pool sample: {athletes.slice(0, 3).map((a) => a.name).join(', ')}…</p>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-ink-800/80 text-left not-dark:border-ink-200">
            {head.map((h) => (
              <th key={h} className="px-5 py-3 font-medium text-ink-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-ink-800/50 last:border-0 not-dark:border-ink-100">
              {r.map((c, j) => (
                <td key={j} className="px-5 py-3 text-ink-200 not-dark:text-ink-700">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
