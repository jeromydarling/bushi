import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { STYLE_LABELS } from '@bushi/domain';
import { Badge, Button, Card, Container } from '../../components/ui.js';
import { NotFound } from '../NotFound.js';
import { findSchool } from '../../lib/demo.js';
import { api, API_CONFIGURED } from '../../lib/api.js';
import { useSeo } from '../../lib/seo.js';

interface RosterEntry { name: string; style: string; belt: string; record?: string }
interface SchoolVM {
  name: string;
  styles: string[];
  city: string;
  region: string;
  athletes: number;
  rank?: number;
  bio?: string;
  roster: RosterEntry[];
}

function styleLabel(s: string): string {
  return (STYLE_LABELS as Record<string, string>)[s] ?? s;
}

export function PublicSchool() {
  const { slug } = useParams();
  const [vm, setVm] = useState<SchoolVM | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading');

  useEffect(() => {
    let active = true;
    if (!API_CONFIGURED) {
      const demo = slug ? findSchool(slug) : undefined;
      if (!demo) return setState('notfound');
      setVm({
        name: demo.name,
        styles: demo.styles,
        city: demo.city,
        region: demo.region,
        athletes: demo.athletes,
        rank: demo.rank,
        roster: [],
      });
      return setState('ready');
    }
    void api.publicSchool(slug ?? '').then((res) => {
      if (!active) return;
      if (!res.ok) return setState('notfound');
      const { school: s, athletes, rankings } = res.data;
      let styles: string[] = [];
      try {
        styles = JSON.parse(s.styles) as string[];
      } catch {
        styles = [];
      }
      setVm({
        name: s.name,
        styles,
        city: s.city ?? '',
        region: s.region ?? '',
        athletes: athletes.length,
        rank: rankings[0]?.rank,
        bio: s.bio ?? undefined,
        roster: athletes.map((a) => ({
          name: `${a.first_name} ${a.last_name}`,
          style: a.primary_style ?? '',
          belt: a.belt_rank ?? '',
        })),
      });
      setState('ready');
    });
    return () => {
      active = false;
    };
  }, [slug]);

  const school = vm;
  useSeo(
    school ? `${school.name} — Martial arts school` : 'School — Bushi',
    school ? `${school.name} in ${school.city}, ${school.region}. Roster, rankings, and results on Bushi.` : undefined,
  );

  if (state === 'loading') {
    return <Container className="py-24 text-center text-sm text-ink-500">Loading school…</Container>;
  }
  if (state === 'notfound' || !school) return <NotFound />;

  return (
    <>
      <div className="relative overflow-hidden border-b border-ink-800/80 not-dark:border-ink-200">
        <div className="absolute inset-0 grid-lines opacity-30" />
        <Container className="relative py-14">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-kiai-500 font-display text-2xl font-bold text-white">
              {school.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-3xl font-bold text-white not-dark:text-ink-900">{school.name}</h1>
                {school.rank != null && <Badge tone="accent">Ranked #{school.rank}</Badge>}
              </div>
              <p className="text-sm text-ink-400">
                {[school.city, school.region].filter(Boolean).join(', ')} · {school.athletes} athletes
              </p>
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-ink-300 not-dark:text-ink-600">
            {school.bio ??
              `A competition-focused program with a proven tournament record across ${school.styles
                .map(styleLabel)
                .join(' and ')}. Disciplined coaching, real results.`}
          </p>
          <div className="mt-6 flex gap-3">
            <Button as="link" to="/signup">Claim this school</Button>
          </div>
        </Container>
      </div>

      <Container className="py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="font-display text-xl font-bold text-white not-dark:text-ink-900">Roster highlights</h2>
            {school.roster.length === 0 ? (
              <Card className="mt-4 p-6 text-sm text-ink-500">No public roster yet.</Card>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {school.roster.slice(0, 6).map((a) => (
                  <Card key={a.name} className="flex items-center justify-between p-4">
                    <div>
                      <div className="font-medium text-white not-dark:text-ink-900">{a.name}</div>
                      <div className="text-xs text-ink-500">{[styleLabel(a.style), a.belt].filter(Boolean).join(' · ')}</div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-white not-dark:text-ink-900">Rankings</h2>
            <Card className="mt-4 space-y-3">
              {school.styles.map((s) => (
                <div key={s} className="flex items-center justify-between">
                  <span className="text-sm text-ink-300">{styleLabel(s)}</span>
                  {school.rank != null && <Badge tone="success">#{school.rank} · {school.region}</Badge>}
                </div>
              ))}
            </Card>
          </div>
        </div>
      </Container>
    </>
  );
}
