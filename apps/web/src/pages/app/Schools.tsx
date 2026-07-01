import { Link, useParams } from 'react-router-dom';
import { STYLE_LABELS } from '@bushi/domain';
import { Badge, Button, Card } from '../../components/ui.js';
import { athletes, schools } from '../../lib/demo.js';
import { useSeo } from '../../lib/seo.js';

export function Schools() {
  useSeo('Schools · Bushi');
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white not-dark:text-ink-900">Schools</h1>
        <Button size="sm">+ Add school</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {schools.map((s) => (
          <Link key={s.id} to={`/app/schools/${s.id}`}>
            <Card interactive>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white not-dark:text-ink-900">{s.name}</h3>
                <Badge tone="accent">#{s.rank}</Badge>
              </div>
              <div className="mt-1 text-xs text-ink-500">{s.city}, {s.region}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.styles.map((st) => (
                  <span key={st} className="rounded-full border border-ink-800 px-2 py-0.5 text-xs text-ink-400 not-dark:border-ink-200">{STYLE_LABELS[st]}</span>
                ))}
              </div>
              <div className="mt-4 text-sm text-ink-400">{s.athletes} athletes</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function SchoolDetail() {
  const { id } = useParams();
  const school = schools.find((s) => s.id === id) ?? schools[0]!;
  useSeo(`${school.name} · Bushi`);

  function exportCsv() {
    const header = 'name,style,belt,weight_kg,age,wins,losses';
    const lines = athletes.map((a) => [a.name, a.style, a.belt, a.weightKg, a.age, a.wins, a.losses].join(','));
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${school.slug}-roster.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/app/schools" className="text-xs text-ink-500 hover:text-ink-300">← Schools</Link>
          <h1 className="font-display text-2xl font-bold text-white not-dark:text-ink-900">{school.name}</h1>
          <p className="text-sm text-ink-400">{school.city}, {school.region} · {school.athletes} athletes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={exportCsv}>Export CSV</Button>
          <Button size="sm">Import CSV</Button>
          <Button as="link" to={`/s/${school.slug}`} variant="ghost" size="sm">Public profile</Button>
        </div>
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-ink-800/80 text-left not-dark:border-ink-200">
                {['Athlete', 'Style', 'Belt / rank', 'Weight', 'Age', 'Record'].map((h) => (
                  <th key={h} className="px-5 py-3 font-medium text-ink-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {athletes.map((a) => (
                <tr key={a.id} className="border-b border-ink-800/50 last:border-0 not-dark:border-ink-100">
                  <td className="px-5 py-3 font-medium text-white not-dark:text-ink-900">{a.name}</td>
                  <td className="px-5 py-3 text-ink-300">{STYLE_LABELS[a.style]}</td>
                  <td className="px-5 py-3 text-ink-300">{a.belt}</td>
                  <td className="px-5 py-3 text-ink-300">{a.weightKg} kg</td>
                  <td className="px-5 py-3 text-ink-300">{a.age}</td>
                  <td className="px-5 py-3 font-mono text-ink-300">{a.wins}–{a.losses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
