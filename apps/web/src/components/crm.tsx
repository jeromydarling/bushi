import type { ReactNode } from 'react';
import { Badge } from './ui.js';
import { cn } from '../lib/cn.js';

/** Health color band: red <50, amber 50–69, green ≥70. */
export function healthTone(score: number): 'red' | 'amber' | 'green' {
  if (score < 50) return 'red';
  if (score < 70) return 'amber';
  return 'green';
}

const barColors: Record<'red' | 'amber' | 'green', string> = {
  red: 'bg-red-500',
  amber: 'bg-amber-500',
  green: 'bg-emerald-500',
};

const textColors: Record<'red' | 'amber' | 'green', string> = {
  red: 'text-red-400',
  amber: 'text-amber-400',
  green: 'text-emerald-400',
};

/** Small 0–100 health bar shared across CRM pages. */
export function HealthBar({ score, showValue, className }: { score: number; showValue?: boolean; className?: string }) {
  const tone = healthTone(score);
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-800 not-dark:bg-ink-200">
        <div className={cn('h-full rounded-full transition-all', barColors[tone])} style={{ width: `${pct}%` }} />
      </div>
      {showValue && (
        <span className={cn('w-9 shrink-0 text-right font-mono text-xs font-semibold', textColors[tone])}>{Math.round(score)}</span>
      )}
    </div>
  );
}

const STAGE_LABELS: Record<string, string> = {
  trial: 'Trial',
  onboarding: 'Onboarding',
  active: 'Active',
  at_risk: 'At risk',
  churned: 'Churned',
  won_back: 'Won back',
};

/**
 * Stage badge. Tone: active/won_back→success, at_risk→live(red),
 * churned→neutral, trial/onboarding→accent.
 */
export function StageBadge({ stage }: { stage: string }) {
  let tone: 'neutral' | 'accent' | 'success' | 'live' = 'neutral';
  if (stage === 'active' || stage === 'won_back') tone = 'success';
  else if (stage === 'at_risk') tone = 'live';
  else if (stage === 'trial' || stage === 'onboarding') tone = 'accent';
  return <Badge tone={tone}>{STAGE_LABELS[stage] ?? stage}</Badge>;
}

/** A circular health ring for the profile header. */
export function HealthRing({ score, size = 96 }: { score: number; size?: number }) {
  const tone = healthTone(score);
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const ringColor: Record<'red' | 'amber' | 'green', string> = {
    red: 'stroke-red-500',
    amber: 'stroke-amber-500',
    green: 'stroke-emerald-500',
  };
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" className="stroke-ink-800 not-dark:stroke-ink-200" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          className={ringColor[tone]}
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
        />
      </svg>
      <span className={cn('absolute font-display text-2xl font-bold', textColors[tone])}>{Math.round(score)}</span>
    </div>
  );
}

/** Location string helper shared across pages. */
export function locationText(city: string | null, region: string | null, country: string | null): string {
  return [city, region, country].filter(Boolean).join(', ') || 'Location TBD';
}

/** A consistent notice line for degrade-gracefully states. */
export function Notice({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'error' | 'success' }) {
  const tones: Record<string, string> = {
    neutral: 'border-ink-800 text-ink-400 not-dark:border-ink-200 not-dark:text-ink-500',
    error: 'border-kiai-500/40 text-kiai-300',
    success: 'border-emerald-500/40 text-emerald-300',
  };
  return (
    <div className={cn('rounded-lg border px-4 py-3 text-sm', tones[tone])}>{children}</div>
  );
}
