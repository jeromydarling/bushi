import { Badge, Button, Eyebrow, Section } from '../components/ui.js';
import { useSeo } from '../lib/seo.js';

const competitors = ['Bushi', 'Smoothcomp', 'TournamentTiger', 'Kihapp', 'NinjaPanel', 'Spreadsheets'];

// value per competitor: true | false | 'partial'
type Cell = boolean | 'partial';
const rows: { label: string; cells: Cell[] }[] = [
  { label: 'All-styles support', cells: [true, 'partial', 'partial', false, false, 'partial'] },
  { label: 'Free spectator experience', cells: [true, 'partial', false, false, 'partial', false] },
  { label: 'Real-time live scoring', cells: [true, true, 'partial', 'partial', 'partial', false] },
  { label: 'Marketing automation', cells: [true, false, false, false, false, false] },
  { label: 'School growth features', cells: [true, false, false, 'partial', false, false] },
  { label: 'AI content tools', cells: [true, false, false, false, false, false] },
  { label: 'Public school profiles', cells: [true, 'partial', false, false, false, false] },
  { label: 'Content generation', cells: [true, false, false, false, false, false] },
  { label: 'Integration readiness', cells: [true, 'partial', false, false, 'partial', false] },
  { label: 'Modern, fast UX', cells: [true, 'partial', false, 'partial', 'partial', false] },
  { label: 'Cloudflare-native architecture', cells: [true, false, false, false, false, false] },
];

export function Compare() {
  useSeo('Compare · Bushi', 'How Bushi compares to Smoothcomp, TournamentTiger, Kihapp, NinjaPanel, and spreadsheets.');
  return (
    <Section>
      <Eyebrow>How Bushi compares</Eyebrow>
      <h1 className="mt-4 max-w-2xl font-display text-4xl font-bold text-white not-dark:text-ink-900 sm:text-5xl">
        Every style. Every role. One modern platform.
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-ink-300 not-dark:text-ink-600">
        Incumbent tools were built for one discipline, one workflow, one era. Bushi is built for all of
        them — with growth and content tooling nobody else ships.
      </p>

      <div className="mt-12 overflow-x-auto rounded-2xl border border-ink-800/80 not-dark:border-ink-200">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-800/80 not-dark:border-ink-200">
              <th className="p-4 text-left font-medium text-ink-400">Capability</th>
              {competitors.map((c, i) => (
                <th
                  key={c}
                  className={`p-4 text-center font-semibold ${
                    i === 0 ? 'bg-kiai-500/10 text-kiai-300' : 'text-ink-300 not-dark:text-ink-600'
                  }`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-ink-800/60 last:border-0 not-dark:border-ink-100">
                <td className="p-4 font-medium text-ink-200 not-dark:text-ink-700">{r.label}</td>
                {r.cells.map((cell, i) => (
                  <td key={i} className={`p-4 text-center ${i === 0 ? 'bg-kiai-500/5' : ''}`}>
                    <CellMark value={cell} highlight={i === 0} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Button as="link" to="/signup" size="lg">
          Switch to Bushi
        </Button>
        <div className="flex items-center gap-4 text-xs text-ink-500">
          <span className="flex items-center gap-1.5"><Check /> Full</span>
          <span className="flex items-center gap-1.5"><Partial /> Partial</span>
          <span className="flex items-center gap-1.5"><Dash /> None</span>
        </div>
      </div>
      <p className="mt-6 text-xs text-ink-600">
        Comparison reflects Bushi’s positioning and publicly understood capabilities of each product; feature sets evolve.
      </p>
    </Section>
  );
}

function CellMark({ value, highlight }: { value: Cell; highlight?: boolean }) {
  if (value === true) return <span className="inline-flex justify-center">{highlight ? <Badge tone="accent">Yes</Badge> : <Check />}</span>;
  if (value === 'partial') return <Partial />;
  return <Dash />;
}
function Check() {
  return (
    <svg viewBox="0 0 24 24" className="inline h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function Partial() {
  return <span className="inline-block h-1.5 w-4 rounded-full bg-amber-400/70 align-middle" />;
}
function Dash() {
  return <span className="inline-block h-0.5 w-3.5 rounded bg-ink-600 align-middle" />;
}
