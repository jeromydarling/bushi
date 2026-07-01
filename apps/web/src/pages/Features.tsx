import { Card, Eyebrow, Section } from '../components/ui.js';
import { useSeo } from '../lib/seo.js';

const categories = [
  {
    name: 'Tournament operations',
    items: ['Creation wizard with style presets', 'Division templates & custom rulesets', 'Venue, days, and mat/stage setup', 'Event staff roles & assignment', 'Draft → published → live lifecycle'],
  },
  {
    name: 'Live scoring',
    items: ['Durable Object mat rooms', 'Scorekeeper, referee, display & public views', 'Timers, periods, penalties', 'Result confirmation & reconnection', 'Queue-backed durable persistence'],
  },
  {
    name: 'Registration & payments',
    items: ['Public self & bulk school registration', 'Division caps and waitlists', 'Waivers & discount codes', 'Stripe checkout & subscriptions', 'Manual payment states'],
  },
  {
    name: 'Schools & rosters',
    items: ['School profiles & locations', 'Athlete roster management', 'Belt/rank, age & weight tracking', 'Guardians & athlete notes', 'CSV import / export'],
  },
  {
    name: 'Public pages & SEO',
    items: ['Indexable tournament & school pages', 'Live brackets and results', 'Slugs, metadata & structured data', 'Filterable event discovery', 'Rankings & style/location landings'],
  },
  {
    name: 'Marketing automations',
    items: ['Pre-event promotion workflow', 'Post-event content workflow', 'Early-bird & last-chance reminders', 'School-specific recaps', 'Sponsor thank-you content'],
  },
  {
    name: 'AI tools',
    items: ['Promo copy & recaps (Workers AI)', 'Organizer & coach assistants', 'Caption & FAQ generation', 'Semantic search (Vectorize)', 'FLUX-generated brand visuals'],
  },
  {
    name: 'Sponsors & analytics',
    items: ['Sponsor tiers & asset management', 'Leaderboard & result share cards', 'Registration analytics', 'Athlete performance insights', 'Audit logs & admin tooling'],
  },
  {
    name: 'Integrations',
    items: ['Bitoku school-management sync', 'Roster & member import', 'Result sync back to schools', 'Webhooks & API access', 'Cloudflare-native architecture'],
  },
];

export function Features() {
  useSeo('Features · Bushi', 'Everything Bushi does — tournament operations, live scoring, registration, marketing automation, AI, and more.');
  return (
    <>
      <Section className="pb-6">
        <Eyebrow>Everything you need to run an event</Eyebrow>
        <h1 className="mt-4 max-w-2xl font-display text-4xl font-bold text-white not-dark:text-ink-900 sm:text-5xl">
          A complete operating system, not a bracket tool.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-300 not-dark:text-ink-600">
          From the first announcement to the final podium and the recap that follows, Bushi covers the
          whole arc of a tournament — for every style, on modern Cloudflare-native infrastructure.
        </p>
      </Section>
      <Section className="pt-6">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Card key={c.name}>
              <h3 className="font-display text-lg font-semibold text-white not-dark:text-ink-900">{c.name}</h3>
              <ul className="mt-4 space-y-2.5">
                {c.items.map((i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-ink-300 not-dark:text-ink-600">
                    <span className="mt-1 text-kiai-400">▸</span>
                    {i}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
