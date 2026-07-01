import type { ReactNode } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MARTIAL_ARTS_STYLES, STYLE_LABELS, slugify, type MartialArtStyle } from '@bushi/domain';
import { Button, Card } from '../../components/ui.js';
import { cn } from '../../lib/cn.js';
import { useSeo } from '../../lib/seo.js';

const steps = ['Basics', 'Styles', 'Venue & dates', 'Mats', 'Divisions', 'Review'] as const;

export function TournamentWizard() {
  useSeo('New tournament · Bushi');
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [styles, setStyles] = useState<MartialArtStyle[]>([]);
  const [city, setCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [mats, setMats] = useState(4);
  const [divisions, setDivisions] = useState<string[]>(['Adult Black -76kg', 'Junior -57kg']);

  const canNext = [name.trim().length > 2, styles.length > 0, startDate !== '', mats > 0, divisions.length > 0, true][step];

  function toggleStyle(s: MartialArtStyle) {
    setStyles((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-white not-dark:text-ink-900">Create a tournament</h1>
      {/* stepper */}
      <ol className="mt-6 flex flex-wrap gap-2">
        {steps.map((s, i) => (
          <li key={s}>
            <button
              onClick={() => i <= step && setStep(i)}
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                i === step
                  ? 'border-kiai-500/50 bg-kiai-500/10 text-kiai-300'
                  : i < step
                    ? 'border-ink-700 text-ink-300'
                    : 'border-ink-800 text-ink-600',
              )}
            >
              <span className="font-mono">{i + 1}</span>
              {s}
            </button>
          </li>
        ))}
      </ol>

      <Card className="mt-6">
        {step === 0 && (
          <Field label="Tournament name" hint={name ? `bushi.app/t/${slugify(name)}` : 'Give it a memorable name'}>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Bushi Summer Open 2026" />
          </Field>
        )}

        {step === 1 && (
          <div>
            <p className="mb-3 text-sm font-medium text-ink-300 not-dark:text-ink-600">Which styles will you run?</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MARTIAL_ARTS_STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleStyle(s)}
                  className={cn(
                    'rounded-lg border px-3 py-3 text-left text-sm font-medium transition-colors',
                    styles.includes(s)
                      ? 'border-kiai-500/50 bg-kiai-500/10 text-white not-dark:text-ink-900'
                      : 'border-ink-800 text-ink-300 hover:border-ink-700 not-dark:border-ink-200',
                  )}
                >
                  {STYLE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City"><input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} placeholder="San Jose, CA" /></Field>
            <Field label="Start date"><input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
          </div>
        )}

        {step === 3 && (
          <Field label="Number of mats" hint="You can rename and assign divisions later.">
            <input type="number" min={1} max={20} className={inputCls} value={mats} onChange={(e) => setMats(Math.max(1, Number(e.target.value)))} />
            <div className="mt-4 flex flex-wrap gap-2">
              {Array.from({ length: mats }, (_, i) => (
                <span key={i} className="rounded-lg border border-ink-800 px-3 py-1.5 text-sm text-ink-300 not-dark:border-ink-200">Mat {i + 1}</span>
              ))}
            </div>
          </Field>
        )}

        {step === 4 && (
          <div>
            <p className="mb-3 text-sm font-medium text-ink-300 not-dark:text-ink-600">Divisions</p>
            <div className="space-y-2">
              {divisions.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className={inputCls}
                    value={d}
                    onChange={(e) => setDivisions((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                  />
                  <Button variant="ghost" size="sm" onClick={() => setDivisions((prev) => prev.filter((_, j) => j !== i))}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => setDivisions((prev) => [...prev, 'New division'])}>
              + Add division
            </Button>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3 text-sm">
            <Review label="Name" value={name || '—'} />
            <Review label="Styles" value={styles.map((s) => STYLE_LABELS[s]).join(', ') || '—'} />
            <Review label="Location" value={city || '—'} />
            <Review label="Start" value={startDate || '—'} />
            <Review label="Mats" value={String(mats)} />
            <Review label="Divisions" value={String(divisions.length)} />
            <p className="pt-2 text-ink-500">Creating this will POST to <span className="font-mono">/api/tournaments</span> and land you in the command center.</p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-ink-800/70 pt-4 not-dark:border-ink-200">
          <Button variant="ghost" onClick={() => (step === 0 ? navigate('/app') : setStep(step - 1))}>
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          {step < steps.length - 1 ? (
            <Button disabled={!canNext} onClick={() => setStep(step + 1)}>
              Continue
            </Button>
          ) : (
            <Button onClick={() => navigate('/app/tournaments/tour-summer')}>Create tournament</Button>
          )}
        </div>
      </Card>
    </div>
  );
}

const inputCls = cn(
  'w-full rounded-lg border border-ink-700 bg-ink-900 px-3.5 py-2.5 text-sm text-white placeholder:text-ink-600',
  'focus:border-kiai-500/60 focus:outline-none focus:ring-2 focus:ring-kiai-500/30',
  'not-dark:border-ink-200 not-dark:bg-white not-dark:text-ink-900',
);

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-300 not-dark:text-ink-600">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block font-mono text-xs text-ink-600">{hint}</span>}
    </label>
  );
}
function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-ink-800/60 pb-2 not-dark:border-ink-100">
      <span className="text-ink-500">{label}</span>
      <span className="font-medium text-white not-dark:text-ink-900">{value}</span>
    </div>
  );
}
