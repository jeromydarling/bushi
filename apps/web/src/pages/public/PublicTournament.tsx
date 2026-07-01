import { Link, useParams } from 'react-router-dom';
import { STYLE_LABELS } from '@bushi/domain';
import { Badge, Button, Card, Container } from '../../components/ui.js';
import { StatusBadge } from '../app/Dashboard.js';
import { findTournament, tournaments } from '../../lib/demo.js';
import { useSeo } from '../../lib/seo.js';

export function PublicTournament() {
  const { slug } = useParams();
  const t = (slug && findTournament(slug)) || tournaments[0]!;
  useSeo(`${t.name} — Live results & registration`, `Follow ${t.name} in ${t.city}, ${t.region}. Live brackets, results, and registration on Bushi.`);

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
          <p className="mt-3 text-lg text-ink-300 not-dark:text-ink-600">{t.city}, {t.region} · Grand Pavilion Arena</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {t.styles.map((s) => (
              <Badge key={s} tone="accent">{STYLE_LABELS[s]}</Badge>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg">Register now</Button>
            <Button as="link" to={`/t/${t.slug}/results`} variant="secondary" size="lg">Live results</Button>
          </div>
        </Container>
      </div>

      <Container className="py-12">
        <div className="grid gap-4 sm:grid-cols-3">
          {[['Registrations', t.registrations], ['Divisions', t.divisions], ['Mats', t.mats]].map(([l, v]) => (
            <Card key={l as string} className="text-center">
              <div className="font-display text-3xl font-bold text-white not-dark:text-ink-900">{v}</div>
              <div className="mt-1 text-sm text-ink-400">{l}</div>
            </Card>
          ))}
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="font-display text-xl font-bold text-white not-dark:text-ink-900">Schedule</h2>
            <Card className="mt-3 space-y-2 p-4">
              {['9:00 Check-in & weigh-ins', '10:00 Divisions begin (all mats)', '13:00 Semifinals', '15:00 Finals & podium'].map((row) => (
                <div key={row} className="rounded-lg px-3 py-2 text-sm text-ink-200 not-dark:text-ink-700">{row}</div>
              ))}
            </Card>
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-white not-dark:text-ink-900">Sponsors</h2>
            <Card className="mt-3 space-y-2 p-4">
              {['Katana Gear Co. — Gold', 'Dojo Nutrition — Silver'].map((s) => (
                <div key={s} className="rounded-lg border border-ink-800 px-3 py-2 text-sm text-ink-300 not-dark:border-ink-200">{s}</div>
              ))}
            </Card>
          </div>
        </div>
      </Container>
    </>
  );
}
