import type { ReactNode } from 'react';
import { useState } from 'react';
import { Badge, Button, Card, Eyebrow, Section } from '../components/ui.js';
import { cn, usd } from '../lib/cn.js';
import { startCheckout } from '../lib/billing.js';
import { useSeo } from '../lib/seo.js';

interface Tier {
  key: string;
  name: string;
  monthly: number; // cents
  tagline: string;
  cta: string;
  featured?: boolean;
  features: string[];
}

const tiers: Tier[] = [
  {
    key: 'free',
    name: 'Free',
    monthly: 0,
    tagline: 'Run your first event.',
    cta: 'Start free',
    features: ['1 active tournament', 'Up to 64 competitors', 'Live scoring on 2 mats', 'Public event & results pages', 'Community support'],
  },
  {
    key: 'starter',
    name: 'Starter',
    monthly: 4900,
    tagline: 'For growing clubs.',
    cta: 'Choose Starter',
    features: ['3 active tournaments', 'Up to 256 competitors', 'Unlimited mats', 'Registration & Stripe payments', 'CSV import & rosters', 'Email support'],
  },
  {
    key: 'pro',
    name: 'Pro',
    monthly: 14900,
    tagline: 'For serious circuits.',
    cta: 'Choose Pro',
    featured: true,
    features: ['Unlimited tournaments', 'Unlimited competitors', 'Marketing automations', 'AI content & assistants', 'Sponsor & analytics tools', 'Priority support'],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    monthly: -1,
    tagline: 'Federations & series.',
    cta: 'Book a demo',
    features: ['Multi-org & series management', 'Rankings & sanctioning', 'Bitoku integration', 'SSO & custom roles', 'Dedicated onboarding', 'SLA'],
  },
];

const addons = [
  { name: 'Marketing Automation', price: '+$39/mo', body: 'Pre- and post-event campaign workflows with AI-written content and share cards.' },
  { name: 'School Profile Premium', price: '+$19/mo', body: 'Enhanced public school profiles, custom branding, and priority discovery placement.' },
];

const faqs: [string, string][] = [
  ['Is the spectator experience really free?', 'Yes. Public event pages, live brackets, and mat-by-mat scoring are always free for spectators — no account required.'],
  ['Do you take a cut of registrations?', 'On Free you connect your own Stripe and keep your revenue minus Stripe fees. Paid plans add lower platform fees and payouts.'],
  ['Can I switch plans anytime?', 'Absolutely — upgrade or downgrade at any time. Annual billing saves roughly two months.'],
  ['What styles are supported?', 'Karate, Taekwondo, BJJ, Judo, Kickboxing, amateur MMA, and open/mixed rulesets — with per-division custom rules.'],
];

export function Pricing() {
  useSeo('Pricing · Bushi', 'Simple pricing for organizers — Free, Starter, Pro, and Enterprise, plus marketing and school add-ons.');
  const [annual, setAnnual] = useState(true);

  return (
    <>
      <Section className="pb-8 text-center">
        <div className="mx-auto max-w-2xl">
          <Eyebrow>Pricing</Eyebrow>
          <h1 className="mt-4 font-display text-4xl font-bold text-white not-dark:text-ink-900 sm:text-5xl">
            Priced for the people who run the sport.
          </h1>
          <p className="mt-5 text-lg text-ink-300 not-dark:text-ink-600">
            Start free. Upgrade when your circuit grows. Spectators never pay.
          </p>
          <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-ink-800 p-1 not-dark:border-ink-200">
            <ToggleBtn active={!annual} onClick={() => setAnnual(false)}>Monthly</ToggleBtn>
            <ToggleBtn active={annual} onClick={() => setAnnual(true)}>
              Annual <span className="ml-1 text-kiai-400">−17%</span>
            </ToggleBtn>
          </div>
        </div>
      </Section>

      <Section className="pt-0">
        <div className="grid gap-5 lg:grid-cols-4">
          {tiers.map((t) => (
            <Card
              key={t.key}
              className={cn('flex flex-col', t.featured && 'border-kiai-500/50 shadow-glow')}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-white not-dark:text-ink-900">{t.name}</h3>
                {t.featured && <Badge tone="accent">Most popular</Badge>}
              </div>
              <p className="mt-1 text-sm text-ink-400">{t.tagline}</p>
              <div className="mt-5">
                {t.monthly < 0 ? (
                  <div className="font-display text-3xl font-bold text-white not-dark:text-ink-900">Custom</div>
                ) : (
                  <div className="flex items-end gap-1">
                    <span className="font-display text-4xl font-bold text-white not-dark:text-ink-900">
                      {t.monthly === 0 ? '$0' : usd(annual ? Math.round((t.monthly * 10) / 12) : t.monthly)}
                    </span>
                    <span className="mb-1 text-sm text-ink-500">/mo</span>
                  </div>
                )}
                {annual && t.monthly > 0 && (
                  <div className="mt-1 text-xs text-ink-500">billed {usd(t.monthly * 10)}/yr</div>
                )}
              </div>
              <Button
                className="mt-5"
                variant={t.featured ? 'primary' : 'secondary'}
                onClick={() => (t.key === 'enterprise' ? (window.location.href = '/signup') : startCheckout(t.key))}
              >
                {t.cta}
              </Button>
              <ul className="mt-6 space-y-2.5 border-t border-ink-800/70 pt-6 not-dark:border-ink-200">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-ink-300 not-dark:text-ink-600">
                    <span className="mt-1 text-kiai-400">▸</span>
                    {f}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        {/* Add-ons */}
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {addons.map((a) => (
            <Card key={a.name} className="flex items-start justify-between gap-4">
              <div>
                <h4 className="font-semibold text-white not-dark:text-ink-900">{a.name}</h4>
                <p className="mt-1 text-sm text-ink-400">{a.body}</p>
              </div>
              <span className="shrink-0 font-mono text-sm text-kiai-400">{a.price}</span>
            </Card>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section className="pt-0">
        <h2 className="font-display text-2xl font-bold text-white not-dark:text-ink-900">Questions, answered.</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {faqs.map(([q, a]) => (
            <Card key={q}>
              <h4 className="font-semibold text-white not-dark:text-ink-900">{q}</h4>
              <p className="mt-2 text-sm text-ink-400">{a}</p>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
        active ? 'bg-ink-800 text-white not-dark:bg-ink-900 not-dark:text-white' : 'text-ink-400 hover:text-white not-dark:hover:text-ink-900',
      )}
    >
      {children}
    </button>
  );
}
