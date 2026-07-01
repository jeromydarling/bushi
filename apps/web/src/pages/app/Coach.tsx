import { STYLE_LABELS } from '@bushi/domain';
import { Card } from '../../components/ui.js';
import { athletes } from '../../lib/demo.js';
import { useSeo } from '../../lib/seo.js';

export function Coach() {
  useSeo('Coach · Bushi');
  const totalWins = athletes.reduce((s, a) => s + a.wins, 0);
  const totalMatches = athletes.reduce((s, a) => s + a.wins + a.losses, 0);
  const winRate = Math.round((totalWins / totalMatches) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white not-dark:text-ink-900">Coach dashboard</h1>
        <p className="mt-1 text-sm text-ink-400">Performance and roster trends for Ironbound BJJ.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ['Team win rate', `${winRate}%`],
          ['Total bouts', String(totalMatches)],
          ['Athletes competing', String(athletes.length)],
          ['Podiums (season)', '23'],
        ].map(([label, value]) => (
          <Card key={label} className="p-5">
            <div className="font-display text-2xl font-bold text-white not-dark:text-ink-900">{value}</div>
            <div className="mt-1 text-xs text-ink-400">{label}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold text-white not-dark:text-ink-900">Athlete performance</h2>
          <div className="mt-4 space-y-3">
            {athletes.map((a) => {
              const total = a.wins + a.losses;
              const pct = Math.round((a.wins / total) * 100);
              return (
                <div key={a.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-ink-200 not-dark:text-ink-700">{a.name}</span>
                    <span className="font-mono text-xs text-ink-500">{a.wins}–{a.losses} · {pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-ink-800 not-dark:bg-ink-100">
                    <div className="h-full rounded-full bg-kiai-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-white not-dark:text-ink-900">AI coach assistant</h2>
          <p className="mt-1 text-sm text-ink-400">Ask for athlete summaries or event insights.</p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-lg bg-ink-800/60 p-3 text-ink-300 not-dark:bg-ink-100">
              “Kenji Tanaka is on a 5-bout win streak, mostly by submission. Consider the -76kg Purple
              division at the Summer Open — the bracket favors his guard passing.”
            </div>
            <div className="rounded-lg border border-ink-800 p-3 text-ink-400 not-dark:border-ink-200">
              Roster trend: your blue belts improved 12% in points-decision wins this quarter.
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <input className="flex-1 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-white not-dark:border-ink-200 not-dark:bg-white not-dark:text-ink-900" placeholder="Summarize Mia’s last 3 events…" />
          </div>
          <p className="mt-3 text-xs text-ink-600">
            Styles coached: {[...new Set(athletes.map((a) => STYLE_LABELS[a.style]))].join(', ')}
          </p>
        </Card>
      </div>
    </div>
  );
}
