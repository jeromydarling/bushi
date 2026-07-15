import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, Card, Container } from '../../components/ui.js';
import { BracketView, type BracketMatch } from '../../components/BracketView.js';
import { NotFound } from '../NotFound.js';
import { findTournament } from '../../lib/demo.js';
import { api, API_CONFIGURED, type PublicMatchRow } from '../../lib/api.js';
import { useSeo } from '../../lib/seo.js';

const demoRounds: { title: string; matches: BracketMatch[] }[] = [
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
  { title: 'Final', matches: [{ label: 'Final', a: { name: 'K. Tanaka' }, b: { name: '—' } }] },
];

export function PublicResults() {
  const { slug } = useParams();
  const [name, setName] = useState<string | null>(null);
  const [matches, setMatches] = useState<PublicMatchRow[] | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading');

  useEffect(() => {
    let active = true;
    if (!API_CONFIGURED) {
      const demo = slug ? findTournament(slug) : undefined;
      if (!demo) return setState('notfound');
      setName(demo.name);
      setMatches(null); // demo → show illustrative bracket
      return setState('ready');
    }
    void api.publicResults(slug ?? '').then((res) => {
      if (!active) return;
      if (!res.ok) return setState('notfound');
      setName(res.data.tournament.name);
      setMatches(res.data.matches);
      setState('ready');
    });
    return () => {
      active = false;
    };
  }, [slug]);

  useSeo(
    name ? `${name} — Live brackets & results` : 'Results — Bushi',
    name ? `Live single-elimination brackets and results for ${name}.` : undefined,
  );

  if (state === 'loading') {
    return <Container className="py-24 text-center text-sm text-ink-500">Loading results…</Container>;
  }
  if (state === 'notfound' || !name) return <NotFound />;

  return (
    <Container className="py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to={`/t/${slug}`} className="text-xs text-ink-500 hover:text-ink-300">← {name}</Link>
          <h1 className="mt-1 font-display text-2xl font-bold text-white not-dark:text-ink-900">Live brackets & results</h1>
        </div>
        <Badge tone="live">Updating live</Badge>
      </div>

      {matches === null ? (
        <div className="mt-6 rounded-2xl border border-ink-800/80 bg-ink-900/40 p-5 not-dark:border-ink-200 not-dark:bg-white">
          <div className="mb-4 text-sm font-semibold text-ink-300">BJJ Adult Purple −76kg</div>
          <BracketView rounds={demoRounds} />
        </div>
      ) : matches.length === 0 ? (
        <Card className="mt-6 p-8 text-center text-sm text-ink-500">
          Brackets will appear here once divisions are seeded and matches begin.
        </Card>
      ) : (
        <Card className="mt-6 p-0">
          {matches.map((m) => (
            <div key={m.id} className="flex items-center justify-between border-b border-ink-800/50 px-5 py-3 text-sm last:border-0 not-dark:border-ink-100">
              <span className="font-mono text-ink-400">{m.label ?? `R${m.round} · #${m.ordinal + 1}`}</span>
              <Badge tone={m.status === 'completed' ? 'success' : m.status === 'live' ? 'live' : 'neutral'}>{m.status}</Badge>
              <span className="text-ink-400">{m.method ?? (m.winner_athlete_id ? 'decided' : '—')}</span>
            </div>
          ))}
        </Card>
      )}

      <p className="mt-6 text-center text-sm text-ink-500">
        Brackets update in real time as scorekeepers confirm results — free for everyone, no account needed.
      </p>
    </Container>
  );
}
