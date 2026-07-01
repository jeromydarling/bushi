import { STYLE_LABELS, MARTIAL_ARTS_STYLES } from '@bushi/domain';
import { HeroArt } from '../components/HeroArt.js';
import { Badge, Button, Card, Container, Eyebrow, Section, Stat } from '../components/ui.js';
import { useSeo } from '../lib/seo.js';

export function Home() {
  useSeo(
    'Bushi 武士 — The operating system for martial arts tournaments',
    'Run tournaments across every martial art with live scoring, registration, marketing automation, and a free spectator experience. Cloudflare-native and fast.',
  );
  return (
    <>
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-ink-800/80 not-dark:border-ink-200">
        <div className="absolute inset-0 grid-lines opacity-40" />
        <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-kiai-500/10 blur-3xl" />
        <Container className="relative">
          <div className="grid items-center gap-12 py-20 sm:py-28 lg:grid-cols-2">
            <div className="animate-fade-up">
              <Eyebrow>Tournament operations · reimagined</Eyebrow>
              <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-white not-dark:text-ink-900 sm:text-6xl">
                Run the tournament.
                <br />
                <span className="text-kiai-400">Not the spreadsheet.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg text-ink-300 not-dark:text-ink-600">
                Bushi is the modern platform for martial arts tournaments — every style, real-time
                scoring on every mat, registration and payments, and a free, polished spectator
                experience the whole gym will watch.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button as="link" to="/signup" size="lg">
                  Start free →
                </Button>
                <Button as="link" to="/app/tournaments/tour-summer/mat/1" variant="secondary" size="lg">
                  See live scoring
                </Button>
              </div>
              <div className="mt-10 flex flex-wrap gap-8 border-t border-ink-800/80 pt-8 not-dark:border-ink-200">
                <Stat value="7" label="Styles supported" />
                <Stat value="Real-time" label="Mat scoring" />
                <Stat value="Free" label="For spectators" />
              </div>
            </div>
            <div className="animate-fade-up [animation-delay:120ms]">
              <HeroArt />
            </div>
          </div>
        </Container>
      </div>

      {/* Styles strip */}
      <div className="border-b border-ink-800/80 py-8 not-dark:border-ink-200">
        <Container>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">
              One platform, every style
            </span>
            {MARTIAL_ARTS_STYLES.map((s) => (
              <span key={s} className="font-display text-sm font-semibold text-ink-300 not-dark:text-ink-600">
                {STYLE_LABELS[s]}
              </span>
            ))}
          </div>
        </Container>
      </div>

      {/* Personas */}
      <Section>
        <div className="max-w-2xl">
          <Eyebrow>Built for everyone on the floor</Eyebrow>
          <h2 className="mt-4 font-display text-3xl font-bold text-white not-dark:text-ink-900 sm:text-4xl">
            A single system, tuned to each role.
          </h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {personas.map((p) => (
            <Card key={p.title} interactive>
              <div className="text-2xl">{p.glyph}</div>
              <h3 className="mt-4 font-display text-lg font-semibold text-white not-dark:text-ink-900">
                {p.title}
              </h3>
              <p className="mt-2 text-sm text-ink-400">{p.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* Workflow feature rows */}
      <Section className="border-t border-ink-800/80 not-dark:border-ink-200">
        <div className="grid gap-16">
          {workflows.map((w, i) => (
            <div key={w.title} className={`grid items-center gap-10 lg:grid-cols-2 ${i % 2 ? 'lg:[direction:rtl]' : ''}`}>
              <div className="lg:[direction:ltr]">
                <Eyebrow>{w.eyebrow}</Eyebrow>
                <h3 className="mt-4 font-display text-2xl font-bold text-white not-dark:text-ink-900 sm:text-3xl">
                  {w.title}
                </h3>
                <p className="mt-4 text-ink-300 not-dark:text-ink-600">{w.body}</p>
                <ul className="mt-6 space-y-2.5">
                  {w.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2.5 text-sm text-ink-300 not-dark:text-ink-600">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-kiai-500" />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
              <Card className="lg:[direction:ltr]">{w.visual}</Card>
            </div>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <Section>
        <Card className="relative overflow-hidden border-kiai-500/30 bg-gradient-to-br from-ink-900 to-ink-950 p-10 text-center not-dark:from-white not-dark:to-ink-100 sm:p-16">
          <div className="absolute inset-0 grid-lines opacity-30" />
          <div className="relative">
            <span className="font-jp text-2xl font-bold text-kiai-400">武士</span>
            <h2 className="mt-4 font-display text-3xl font-bold text-white not-dark:text-ink-900 sm:text-4xl">
              Bring discipline to your next event.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-ink-300 not-dark:text-ink-600">
              Spin up a tournament in minutes. Score live on every mat. Grow the schools that make it
              happen. Start free — no card required.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Button as="link" to="/signup" size="lg">
                Start free
              </Button>
              <Button as="link" to="/pricing" variant="secondary" size="lg">
                View pricing
              </Button>
            </div>
          </div>
        </Card>
      </Section>
    </>
  );
}

const personas = [
  { glyph: '🏯', title: 'Organizers', body: 'Wizard-fast setup, division templates, mat assignment, and a live command center for the whole event.' },
  { glyph: '🥋', title: 'Schools', body: 'Bulk-register squads, track rosters and ranks, and grow with automated pre- and post-event marketing.' },
  { glyph: '📋', title: 'Coaches', body: 'Athlete performance summaries, roster trends, and event insights — always current.' },
  { glyph: '📱', title: 'Spectators', body: 'A free, mobile-first live experience: brackets, results, and mat-by-mat scoring in real time.' },
];

const workflows = [
  {
    eyebrow: 'Real-time operations',
    title: 'Live scoring on every mat, in real time.',
    body: 'Durable Objects keep each mat’s state authoritative and instant. Scorekeepers, referee tablets, display boards, and public viewers all stay in perfect sync — and reconnect cleanly.',
    points: ['Scorekeeper, referee, display and public views', 'Wall-clock-accurate match timers and periods', 'Reconnect-safe state that survives dropped links'],
    visual: <ScoreVisual />,
  },
  {
    eyebrow: 'AI + marketing engine',
    title: 'Fill brackets before they open.',
    body: 'Launch announcements, early-bird nudges, and last-chance reminders run on autopilot. After the event, recaps, winner cards, and school-specific highlights write themselves.',
    points: ['Pre- and post-event automation workflows', 'AI-written promo copy, recaps, and captions', 'Winner spotlight and leaderboard share cards'],
    visual: <CampaignVisual />,
  },
  {
    eyebrow: 'Public pages & SEO',
    title: 'A home for every event and school.',
    body: 'Fast, indexable public pages for tournaments, schools, and results — with structured data and share cards. Spectators discover, register, and follow along.',
    points: ['Public tournament and school profiles', 'Filterable event discovery', 'Rankings and shareable result cards'],
    visual: <DiscoverVisual />,
  },
];

function ScoreVisual() {
  return (
    <div className="rounded-xl bg-ink-950 p-5 not-dark:bg-ink-900">
      <div className="mb-3 flex items-center justify-between text-xs text-ink-500">
        <span className="font-mono">MAT 1 · BJJ PURPLE -76kg</span>
        <Badge tone="live">Live</Badge>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-kiai-500/40 bg-kiai-500/5 p-4 text-center">
          <div className="text-xs font-semibold uppercase tracking-wide text-kiai-300">Red</div>
          <div className="font-display text-5xl font-bold text-white">11</div>
          <div className="mt-1 text-xs text-ink-400">Tanaka</div>
        </div>
        <div className="rounded-lg border border-steel-500/40 bg-steel-500/5 p-4 text-center">
          <div className="text-xs font-semibold uppercase tracking-wide text-steel-300">Blue</div>
          <div className="font-display text-5xl font-bold text-white">6</div>
          <div className="mt-1 text-xs text-ink-400">Garcia</div>
        </div>
      </div>
      <div className="mt-3 text-center font-mono text-2xl font-bold tabular-nums text-white">2:41</div>
    </div>
  );
}

function CampaignVisual() {
  const steps = ['Launch announced', 'Registration open', 'Early-bird reminder', 'Last chance', 'Post-event recap'];
  return (
    <div className="space-y-2.5">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-3 rounded-lg border border-ink-800 bg-ink-950 px-3 py-2.5 not-dark:border-ink-200 not-dark:bg-white">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${i < 3 ? 'bg-kiai-500 text-white' : 'bg-ink-800 text-ink-400'}`}>
            {i < 3 ? '✓' : i + 1}
          </span>
          <span className="text-sm text-ink-200 not-dark:text-ink-700">{s}</span>
          {i < 3 && <span className="ml-auto text-xs text-emerald-400">sent</span>}
        </div>
      ))}
    </div>
  );
}

function DiscoverVisual() {
  return (
    <div className="space-y-2.5">
      {['Bushi Summer Open', 'Iron Valley Invitational', 'Winter Classic'].map((t, i) => (
        <div key={t} className="flex items-center justify-between rounded-lg border border-ink-800 bg-ink-950 px-3 py-3 not-dark:border-ink-200 not-dark:bg-white">
          <div>
            <div className="text-sm font-semibold text-white not-dark:text-ink-900">{t}</div>
            <div className="text-xs text-ink-500">San Jose, CA · Aug 2026</div>
          </div>
          <Badge tone={i === 1 ? 'live' : 'accent'}>{i === 1 ? 'Live' : 'Open'}</Badge>
        </div>
      ))}
    </div>
  );
}
