import { useParams } from 'react-router-dom';
import { STYLE_LABELS } from '@bushi/domain';
import { Badge, Button, Card, Container } from '../../components/ui.js';
import { athletes, findSchool, schools } from '../../lib/demo.js';
import { useSeo } from '../../lib/seo.js';

export function PublicSchool() {
  const { slug } = useParams();
  const school = (slug && findSchool(slug)) || schools[0]!;
  useSeo(`${school.name} — Martial arts school`, `${school.name} in ${school.city}, ${school.region}. Roster, rankings, and results on Bushi.`);

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
                <Badge tone="accent">Ranked #{school.rank}</Badge>
              </div>
              <p className="text-sm text-ink-400">{school.city}, {school.region} · {school.athletes} athletes</p>
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-ink-300 not-dark:text-ink-600">
            A competition-focused program with a proven tournament record across{' '}
            {school.styles.map((s) => STYLE_LABELS[s]).join(' and ')}. Disciplined coaching, real results.
          </p>
          <div className="mt-6 flex gap-3">
            <Button>Contact school</Button>
            <Button variant="secondary">Follow</Button>
          </div>
        </Container>
      </div>

      <Container className="py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="font-display text-xl font-bold text-white not-dark:text-ink-900">Roster highlights</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {athletes.slice(0, 6).map((a) => (
                <Card key={a.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium text-white not-dark:text-ink-900">{a.name}</div>
                    <div className="text-xs text-ink-500">{STYLE_LABELS[a.style]} · {a.belt}</div>
                  </div>
                  <span className="font-mono text-sm text-kiai-400">{a.wins}–{a.losses}</span>
                </Card>
              ))}
            </div>
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-white not-dark:text-ink-900">Rankings</h2>
            <Card className="mt-4 space-y-3">
              {school.styles.map((s) => (
                <div key={s} className="flex items-center justify-between">
                  <span className="text-sm text-ink-300">{STYLE_LABELS[s]}</span>
                  <Badge tone="success">#{school.rank} · {school.region}</Badge>
                </div>
              ))}
              <div className="border-t border-ink-800/60 pt-3 text-xs text-ink-500 not-dark:border-ink-100">
                Season 2026-Q3 · Open Circuit
              </div>
            </Card>
          </div>
        </div>
      </Container>
    </>
  );
}
