import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MARTIAL_ARTS_STYLES, STYLE_LABELS, type MartialArtStyle } from '@bushi/domain';
import { Badge, Button, Card, Container } from '../../components/ui.js';
import { StatusBadge } from '../app/Dashboard.js';
import { api, type DiscoverItem } from '../../lib/api.js';
import { tournaments as demoTournaments } from '../../lib/demo.js';
import { cn } from '../../lib/cn.js';
import { useSeo } from '../../lib/seo.js';

type Timeframe = 'all' | 'upcoming' | 'completed';

// Demo data mapped to the unified shape — the fallback when no API is reachable.
const demoItems: DiscoverItem[] = demoTournaments.map((t) => ({
  id: t.id,
  source: 'bushi',
  name: t.name,
  slug: t.slug,
  styles: t.styles,
  startDate: t.startDate,
  city: t.city,
  region: t.region,
  country: 'US',
  status: t.status,
  sourceUrl: null,
}));

export function Discover() {
  useSeo('Discover tournaments · Bushi', 'Find real martial arts tournaments near you — Bushi-hosted events plus live web results, filterable by style, timeframe, and location.');
  const [q, setQ] = useState('');
  const [style, setStyle] = useState<MartialArtStyle | 'all'>('all');
  const [timeframe, setTimeframe] = useState<Timeframe>('all');
  const [items, setItems] = useState<DiscoverItem[]>(demoItems);
  const [loading, setLoading] = useState(false);
  const [webLoading, setWebLoading] = useState(false);
  const [webRan, setWebRan] = useState(false);

  // Load the unified feed (Bushi + web-discovered) from the API; fall back to demo.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (style !== 'all') params.set('style', style);
    params.set('timeframe', timeframe);
    api.discover(params.toString()).then((res) => {
      if (cancelled) return;
      if (res.ok && res.data.results.length) setItems(res.data.results);
      else if (res.ok) setItems([]); // API reachable but empty
      else setItems(demoItems); // API unreachable → demo
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [q, style, timeframe]);

  const results = useMemo(() => {
    // Server already filters, but keep client filtering for the demo fallback.
    return items.filter((t) => {
      if (q && !`${t.name} ${t.city ?? ''} ${t.region ?? ''}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (style !== 'all' && !t.styles.includes(style)) return false;
      if (timeframe === 'completed' && t.status !== 'completed') return false;
      return true;
    });
  }, [items, q, style, timeframe]);

  async function searchWeb() {
    if (q.trim().length < 3) return;
    setWebLoading(true);
    setWebRan(true);
    const res = await api.discoverWeb(q.trim());
    if (res.ok && res.data.results.length) setItems(res.data.results);
    setWebLoading(false);
  }

  return (
    <Container className="py-12">
      <h1 className="font-display text-3xl font-bold text-white not-dark:text-ink-900">Discover tournaments</h1>
      <p className="mt-2 text-ink-400">Bushi-hosted events plus real tournaments found across the web.</p>

      <div className="mt-6 space-y-3">
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search tournaments by name or city"
            placeholder="Search by name or city…"
            className="w-full rounded-lg border border-ink-700 bg-ink-900 px-4 py-3 text-sm text-white not-dark:border-ink-200 not-dark:bg-white not-dark:text-ink-900"
          />
          <Button variant="secondary" onClick={searchWeb} disabled={q.trim().length < 3 || webLoading}>
            {webLoading ? 'Searching…' : 'Search the web'}
          </Button>
        </div>
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

      {webRan && !webLoading && (
        <p className="mt-4 text-xs text-ink-500">
          Web results are found live and link out to their source. Always confirm dates on the organizer’s page.
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((t) => (
          <DiscoverCard key={`${t.source}-${t.id}`} item={t} />
        ))}
        {!loading && results.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <p className="text-sm text-ink-500">No tournaments match those filters.</p>
            {q.trim().length >= 3 && (
              <Button variant="secondary" className="mt-4" onClick={searchWeb} disabled={webLoading}>
                {webLoading ? 'Searching…' : `Search the web for “${q.trim()}”`}
              </Button>
            )}
          </div>
        )}
      </div>
    </Container>
  );
}

function DiscoverCard({ item }: { item: DiscoverItem }) {
  const inner = (
    <Card interactive className="h-full">
      <div className="flex items-center justify-between">
        {item.source === 'web' ? <Badge tone="neutral">via web ↗</Badge> : <StatusBadge status={item.status ?? 'published'} />}
        {item.startDate && <span className="text-xs text-ink-500">{formatDate(item.startDate)}</span>}
      </div>
      <h3 className="mt-3 font-display text-lg font-semibold text-white not-dark:text-ink-900">{item.name}</h3>
      <div className="text-sm text-ink-400">{[item.city, item.region, item.country].filter(Boolean).join(', ') || 'Location TBD'}</div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {item.styles.map((s) => (
          <Badge key={s} tone="accent">{STYLE_LABELS[s as MartialArtStyle] ?? s}</Badge>
        ))}
      </div>
    </Card>
  );

  if (item.source === 'bushi' && item.slug) {
    return <Link to={`/t/${item.slug}`}>{inner}</Link>;
  }
  if (item.sourceUrl) {
    return (
      <a href={item.sourceUrl} target="_blank" rel="noreferrer noopener">
        {inner}
      </a>
    );
  }
  return inner;
}

function formatDate(d: string): string {
  const t = Date.parse(d);
  return Number.isNaN(t) ? d : new Date(t).toLocaleDateString();
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
