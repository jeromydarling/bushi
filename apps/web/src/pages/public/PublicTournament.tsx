import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { STYLE_LABELS } from '@bushi/domain';
import { Badge, Button, Card, Container } from '../../components/ui.js';
import { StatusBadge } from '../app/Dashboard.js';
import { NotFound } from '../NotFound.js';
import { findTournament } from '../../lib/demo.js';
import { api, API_CONFIGURED } from '../../lib/api.js';
import { useSeo, useJsonLd } from '../../lib/seo.js';

interface TournamentVM {
  name: string;
  slug: string;
  status: string;
  startDate: string;
  city: string;
  region: string;
  venue: string;
  styles: string[];
  divisions?: number;
  registrations?: number;
  mats?: number;
  sponsors: string[];
}

function styleLabel(s: string): string {
  return (STYLE_LABELS as Record<string, string>)[s] ?? s;
}

export function PublicTournament() {
  const { slug } = useParams();
  const [vm, setVm] = useState<TournamentVM | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading');

  useEffect(() => {
    let active = true;
    if (!API_CONFIGURED) {
      const demo = slug ? findTournament(slug) : undefined;
      if (!demo) return setState('notfound');
      setVm({
        name: demo.name,
        slug: demo.slug,
        status: demo.status,
        startDate: demo.startDate,
        city: demo.city,
        region: demo.region,
        venue: 'Grand Pavilion Arena',
        styles: demo.styles,
        registrations: demo.registrations,
        divisions: demo.divisions,
        mats: demo.mats,
        sponsors: ['Katana Gear Co. — Gold', 'Dojo Nutrition — Silver'],
      });
      return setState('ready');
    }
    void api.publicTournament(slug ?? '').then((res) => {
      if (!active) return;
      if (!res.ok) return setState('notfound');
      const { tournament: t, divisions, sponsors } = res.data;
      let styles: string[] = [];
      try {
        styles = JSON.parse(t.styles) as string[];
      } catch {
        styles = [];
      }
      setVm({
        name: t.name,
        slug: t.slug,
        status: t.status,
        startDate: t.start_date,
        city: t.city ?? '',
        region: t.region ?? '',
        venue: t.venue_name ?? '',
        styles,
        divisions: divisions.length,
        sponsors: sponsors.map((s) => (s.tier ? `${s.name} — ${s.tier}` : s.name)),
      });
      setState('ready');
    });
    return () => {
      active = false;
    };
  }, [slug]);

  const t = vm;
  useSeo(
    t ? `${t.name} — Live results & registration` : 'Tournament — Bushi',
    t ? `Follow ${t.name} in ${t.city}, ${t.region}. Live brackets, results, and registration on Bushi.` : undefined,
  );
  useJsonLd(
    'tournament',
    t
      ? {
          '@context': 'https://schema.org',
          '@type': 'SportsEvent',
          name: t.name,
          sport: 'Martial Arts',
          startDate: t.startDate,
          eventStatus: 'https://schema.org/EventScheduled',
          location: {
            '@type': 'Place',
            name: t.venue || [t.city, t.region].filter(Boolean).join(', '),
            address: [t.city, t.region].filter(Boolean).join(', '),
          },
          url: typeof location !== 'undefined' ? location.href : undefined,
        }
      : null,
  );

  if (state === 'loading') {
    return <Container className="py-24 text-center text-sm text-ink-500">Loading tournament…</Container>;
  }
  if (state === 'notfound' || !t) return <NotFound />;

  const tiles: Array<[string, number]> = [];
  if (t.registrations != null) tiles.push(['Registrations', t.registrations]);
  if (t.divisions != null) tiles.push(['Divisions', t.divisions]);
  if (t.mats != null) tiles.push(['Mats', t.mats]);

  return (
    <>
      <div className="relative overflow-hidden border-b border-ink-800/80 not-dark:border-ink-200">
        <div className="absolute inset-0 grid-lines opacity-40" />
        <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-kiai-500/10 blur-3xl" />
        <Container className="relative py-14">
          <div className="flex items-center gap-3">
            <StatusBadge status={t.status} />
            <span className="text-sm text-ink-400">{new Date(t.startDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
          </div>
          <h1 className="mt-4 font-display text-4xl font-bold text-white not-dark:text-ink-900 sm:text-5xl">{t.name}</h1>
          <p className="mt-3 text-lg text-ink-300 not-dark:text-ink-600">
            {[t.city, t.region].filter(Boolean).join(', ')}{t.venue ? ` · ${t.venue}` : ''}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {t.styles.map((s) => (
              <Badge key={s} tone="accent">{styleLabel(s)}</Badge>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button as="link" to="/signup" size="lg">Register now</Button>
            <Button as="link" to={`/t/${t.slug}/results`} variant="secondary" size="lg">Live results</Button>
          </div>
        </Container>
      </div>

      <Container className="py-12">
        {tiles.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-3">
            {tiles.map(([l, v]) => (
              <Card key={l} className="text-center">
                <div className="font-display text-3xl font-bold text-white not-dark:text-ink-900">{v}</div>
                <div className="mt-1 text-sm text-ink-400">{l}</div>
              </Card>
            ))}
          </div>
        )}

        {t.sponsors.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display text-xl font-bold text-white not-dark:text-ink-900">Sponsors</h2>
            <Card className="mt-3 space-y-2 p-4">
              {t.sponsors.map((s) => (
                <div key={s} className="rounded-lg border border-ink-800 px-3 py-2 text-sm text-ink-300 not-dark:border-ink-200">{s}</div>
              ))}
            </Card>
          </div>
        )}
      </Container>
    </>
  );
}
