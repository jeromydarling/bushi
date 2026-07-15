import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card } from '../components/ui.js';
import { Logo } from '../components/Logo.js';
import { ThemeToggle } from '../components/ThemeToggle.js';
import { schools, tournaments } from '../lib/demo.js';
import { api, type DiscoveryRun } from '../lib/api.js';
import { useSeo } from '../lib/seo.js';

const flags = [
  { key: 'ai_assistant', on: true },
  { key: 'flux_asset_pipeline', on: false },
  { key: 'stripe_live', on: false },
  { key: 'vectorize_search', on: true },
];

const audit = [
  { action: 'tournament.published', entity: 'Bushi Summer Open', when: '2m ago' },
  { action: 'school.claimed', entity: 'Ironbound BJJ', when: '18m ago' },
  { action: 'payment.succeeded', entity: '$65.00 · reg_1f9', when: '31m ago' },
  { action: 'workflow.completed', entity: 'PostEventContent', when: '1h ago' },
];

export function Admin() {
  useSeo('Admin · Bushi');
  const [q, setQ] = useState('');
  const matches = [...tournaments.map((t) => t.name), ...schools.map((s) => s.name)].filter((n) =>
    n.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-ink-950 not-dark:bg-ink-50">
      <header className="flex items-center justify-between border-b border-ink-800/80 px-5 py-3 not-dark:border-ink-200">
        <div className="flex items-center gap-3">
          <Link to="/"><Logo /></Link>
          <Badge tone="accent">Admin</Badge>
        </div>
        <ThemeToggle />
      </header>
      <div className="mx-auto max-w-5xl space-y-6 p-5 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-white not-dark:text-ink-900">Platform admin</h1>

        <Card interactive className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-white not-dark:text-ink-900">Customer CRM</h2>
            <p className="mt-1 text-sm text-ink-400">
              Retention radar, customer health, at-risk accounts, follow-ups and the customer map.
            </p>
          </div>
          <Button as="link" to="/admin/crm" className="shrink-0">
            Open CRM →
          </Button>
        </Card>

        <Card>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search users, schools, and tournaments"
            placeholder="Search users, schools, tournaments…"
            className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3.5 py-2.5 text-sm text-white not-dark:border-ink-200 not-dark:bg-white not-dark:text-ink-900"
          />
          {q && (
            <div className="mt-3 space-y-1">
              {matches.length ? matches.map((m) => (
                <div key={m} className="rounded-lg px-3 py-2 text-sm text-ink-300 hover:bg-ink-800/50">{m}</div>
              )) : <div className="px-3 py-2 text-sm text-ink-500">No matches</div>}
            </div>
          )}
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="text-sm font-semibold text-white not-dark:text-ink-900">Feature flags</h2>
            <div className="mt-3 space-y-2">
              {flags.map((f) => (
                <div key={f.key} className="flex items-center justify-between rounded-lg border border-ink-800 px-3 py-2 not-dark:border-ink-200">
                  <span className="font-mono text-sm text-ink-300">{f.key}</span>
                  <Badge tone={f.on ? 'success' : 'neutral'}>{f.on ? 'on' : 'off'}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-white not-dark:text-ink-900">Queue & workflow health</h2>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              {[['Queued', '4'], ['Running', '1'], ['Failed', '0']].map(([l, v]) => (
                <div key={l} className="rounded-lg border border-ink-800 py-3 not-dark:border-ink-200">
                  <div className="font-display text-xl font-bold text-white not-dark:text-ink-900">{v}</div>
                  <div className="text-xs text-ink-500">{l}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {['PreEventPromotion', 'PostEventContent', 'SchoolClaim', 'CompetitorOnboarding'].map((w) => (
                <span key={w} className="rounded-full border border-ink-800 px-2.5 py-1 text-xs text-ink-400 not-dark:border-ink-200">{w}</span>
              ))}
            </div>
          </Card>
        </div>

        <DiscoveryPanel />

        <Card className="p-0">
          <div className="border-b border-ink-800/80 px-5 py-3 text-sm font-semibold text-white not-dark:border-ink-200 not-dark:text-ink-900">Audit log</div>
          {audit.map((a, i) => (
            <div key={i} className="flex items-center justify-between border-b border-ink-800/50 px-5 py-3 text-sm last:border-0 not-dark:border-ink-100">
              <span className="font-mono text-kiai-400">{a.action}</span>
              <span className="text-ink-300">{a.entity}</span>
              <span className="text-xs text-ink-600">{a.when}</span>
            </div>
          ))}
        </Card>

        <div className="flex justify-end">
          <Button as="link" to="/app" variant="ghost" size="sm">← Back to console</Button>
        </div>
      </div>
    </div>
  );
}

function DiscoveryPanel() {
  const [runs, setRuns] = useState<DiscoveryRun[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function loadRuns() {
    const res = await api.discoveryRuns();
    if (res.ok) setRuns(res.data.runs);
    else if (res.status === 401 || res.status === 403) setNote('Sign in as a platform admin to manage discovery.');
    else if (res.status === 0) setNote('Connect the API (set VITE_API_BASE) to manage discovery.');
  }

  useEffect(() => {
    void loadRuns();
  }, []);

  async function refresh() {
    setBusy(true);
    setNote(null);
    const res = await api.discoveryRefresh();
    setBusy(false);
    if (res.ok) {
      setNote(`Run complete — found ${res.data.found}, added ${res.data.inserted}, updated ${res.data.updated}.`);
      void loadRuns();
    } else {
      setNote(res.status === 0 ? 'API not reachable.' : res.error);
    }
  }

  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b border-ink-800/80 px-5 py-3 not-dark:border-ink-200">
        <span className="text-sm font-semibold text-white not-dark:text-ink-900">Tournament discovery (Perplexity)</span>
        <Button size="sm" onClick={refresh} disabled={busy}>
          {busy ? 'Running…' : 'Run discovery now'}
        </Button>
      </div>
      {note && <div className="px-5 py-2 text-xs text-ink-400">{note}</div>}
      {runs.length === 0 ? (
        <div className="px-5 py-6 text-center text-sm text-ink-500">
          No discovery runs yet. The nightly cron populates this, or run it now.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-ink-800/60 text-left not-dark:border-ink-100">
                {['When', 'Trigger', 'Found', 'Added', 'Updated', 'Status'].map((h) => (
                  <th key={h} className="px-5 py-2 font-medium text-ink-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map((r, i) => (
                <tr key={i} className="border-b border-ink-800/40 last:border-0 not-dark:border-ink-100">
                  <td className="px-5 py-2 text-ink-400">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-5 py-2 text-ink-300">{r.trigger}</td>
                  <td className="px-5 py-2 text-ink-300">{r.found}</td>
                  <td className="px-5 py-2 text-ink-300">{r.inserted}</td>
                  <td className="px-5 py-2 text-ink-300">{r.updated}</td>
                  <td className="px-5 py-2">
                    <Badge tone={r.status === 'ok' ? 'success' : r.status === 'error' ? 'live' : 'neutral'}>{r.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
