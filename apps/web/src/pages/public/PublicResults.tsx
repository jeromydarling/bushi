import { Link, useParams } from 'react-router-dom';
import { Badge, Container } from '../../components/ui.js';
import { BracketView, type BracketMatch } from '../../components/BracketView.js';
import { findTournament, tournaments } from '../../lib/demo.js';
import { useSeo } from '../../lib/seo.js';

const rounds: { title: string; matches: BracketMatch[] }[] = [
  {
    title: 'Quarterfinals',
    matches: [
      { label: 'QF1', a: { name: 'K. Tanaka', score: 11, winner: true }, b: { name: 'D. Garcia', score: 6 }, live: true },
      { label: 'QF2', a: { name: 'M. Silva', score: 2 }, b: { name: 'S. Rossi', score: 4, winner: true } },
      { label: 'QF3', a: { name: 'L. Nguyen', score: 8, winner: true }, b: { name: 'O. Haddad', score: 5 } },
      { label: 'QF4', a: { name: 'N. Kim', score: 9, winner: true }, b: { name: 'Y. Nakamura', score: 7 } },
    ],
  },
  {
    title: 'Semifinals',
    matches: [
      { label: 'SF1', a: { name: 'K. Tanaka', winner: true, score: 6 }, b: { name: 'S. Rossi', score: 2 } },
      { label: 'SF2', a: { name: 'L. Nguyen' }, b: { name: 'N. Kim' } },
    ],
  },
  {
    title: 'Final',
    matches: [{ label: 'Final', a: { name: 'K. Tanaka' }, b: { name: '—' } }],
  },
];

export function PublicResults() {
  const { slug } = useParams();
  const t = (slug && findTournament(slug)) || tournaments[0]!;
  useSeo(`${t.name} — Live brackets & results`, `Live single-elimination brackets and results for ${t.name}.`);

  return (
    <Container className="py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to={`/t/${t.slug}`} className="text-xs text-ink-500 hover:text-ink-300">← {t.name}</Link>
          <h1 className="mt-1 font-display text-2xl font-bold text-white not-dark:text-ink-900">Live brackets & results</h1>
        </div>
        <Badge tone="live">Updating live</Badge>
      </div>

      <div className="mt-6 rounded-2xl border border-ink-800/80 bg-ink-900/40 p-5 not-dark:border-ink-200 not-dark:bg-white">
        <div className="mb-4 text-sm font-semibold text-ink-300">BJJ Adult Purple −76kg</div>
        <BracketView rounds={rounds} />
      </div>

      <p className="mt-6 text-center text-sm text-ink-500">
        Brackets update in real time as scorekeepers confirm results — free for everyone, no account needed.
      </p>
    </Container>
  );
}
