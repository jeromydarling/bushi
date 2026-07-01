import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MARTIAL_ARTS_STYLES, STYLE_LABELS, type MartialArtStyle } from '@bushi/domain';
import { Badge, Card, Container } from '../../components/ui.js';
import { StatusBadge } from '../app/Dashboard.js';
import { tournaments } from '../../lib/demo.js';
import { cn } from '../../lib/cn.js';
import { useSeo } from '../../lib/seo.js';

type Timeframe = 'all' | 'upcoming' | 'completed';

export function Discover() {
  useSeo('Discover tournaments · Bushi', 'Find martial arts tournaments near you — filter by style, timeframe, and location.');
  const [q, setQ] = useState('');
  const [style, setStyle] = useState<MartialArtStyle | 'all'>('all');
  const [timeframe, setTimeframe] = useState<Timeframe>('all');

  const results = useMemo(() => {
    return tournaments.filter((t) => {
      if (q && !`${t.name} ${t.city} ${t.region}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (style !== 'all' && !t.styles.includes(style)) return false;
      if (timeframe === 'upcoming' && new Date(t.startDate) < new Date()) return false;
      if (timeframe === 'completed' && t.status !== 'completed') return false;
      return true;
    });
  }, [q, style, timeframe]);

  return (
    <Container className="py-12">
      <h1 className="font-display text-3xl font-bold text-white not-dark:text-ink-900">Discover tournaments</h1>
      <p className="mt-2 text-ink-400">Find your next event across every style.</p>

      <div className="mt-6 space-y-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or city…"
          className="w-full rounded-lg border border-ink-700 bg-ink-900 px-4 py-3 text-sm text-white not-dark:border-ink-200 not-dark:bg-white not-dark:text-ink-900"
        />
        <div className="flex flex-wrap gap-2">
          <Chip active={style === 'all'} onClick={() => setStyle('all')}>All styles</Chip>
          {MARTIAL_ARTS_STYLES.map((s) => (
            <Chip key={s} active={style === s} onClick={() => setStyle(s)}>{STYLE_LABELS[s]}</Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'upcoming', 'completed'] as Timeframe[]).map((tf) => (
            <Chip key={tf} active={timeframe === tf} onClick={() => setTimeframe(tf)} tone="steel">
              {tf}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((t) => (
          <Link key={t.id} to={`/t/${t.slug}`}>
            <Card interactive>
              <div className="flex items-center justify-between">
                <StatusBadge status={t.status} />
                <span className="text-xs text-ink-500">{new Date(t.startDate).toLocaleDateString()}</span>
              </div>
              <h3 className="mt-3 font-display text-lg font-semibold text-white not-dark:text-ink-900">{t.name}</h3>
              <div className="text-sm text-ink-400">{t.city}, {t.region}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.styles.map((s) => (
                  <Badge key={s} tone="accent">{STYLE_LABELS[s]}</Badge>
                ))}
              </div>
            </Card>
          </Link>
        ))}
        {results.length === 0 && (
          <p className="col-span-full py-12 text-center text-sm text-ink-500">No tournaments match those filters.</p>
        )}
      </div>
    </Container>
  );
}

function Chip({ active, onClick, children, tone = 'kiai' }: { active: boolean; onClick: () => void; children: ReactNode; tone?: 'kiai' | 'steel' }) {
  const activeCls = tone === 'kiai' ? 'border-kiai-500/50 bg-kiai-500/10 text-kiai-300' : 'border-steel-500/50 bg-steel-500/10 text-steel-300';
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors',
        active ? activeCls : 'border-ink-800 text-ink-400 hover:text-white not-dark:border-ink-200 not-dark:hover:text-ink-900',
      )}
    >
      {children}
    </button>
  );
}
