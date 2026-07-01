import { Link } from 'react-router-dom';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn.js';

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('container-bushi', className)}>{children}</div>;
}

export function Section({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn('py-16 sm:py-24', className)}>
      <Container>{children}</Container>
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-kiai-400">
      <span className="h-px w-6 bg-kiai-500/70" />
      {children}
    </span>
  );
}

type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  as?: 'button' | 'link' | 'a';
  to?: string;
  href?: string;
  children: ReactNode;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-kiai-500/60 disabled:opacity-50 disabled:pointer-events-none';

const variants: Record<string, string> = {
  primary: 'bg-kiai-500 text-white hover:bg-kiai-400 shadow-glow',
  secondary:
    'bg-ink-800 text-ink-50 hover:bg-ink-700 border border-ink-700 dark:bg-ink-800 dark:text-ink-50',
  ghost: 'text-ink-200 hover:text-white hover:bg-ink-800/60',
};

const sizes: Record<string, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  as = 'button',
  to,
  href,
  children,
  className,
  ...rest
}: ButtonProps) {
  const cls = cn(buttonBase, variants[variant], sizes[size], className);
  if (as === 'link' && to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  }
  if (as === 'a' && href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

export function Card({
  children,
  className,
  interactive,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-ink-800/80 bg-ink-900/60 p-6 shadow-card backdrop-blur',
        'dark:border-ink-800/80 dark:bg-ink-900/60',
        'not-dark:border-ink-200 not-dark:bg-white',
        interactive && 'transition-colors hover:border-ink-700',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'success' | 'live';
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-ink-800 text-ink-200 border-ink-700',
    accent: 'bg-kiai-500/15 text-kiai-300 border-kiai-500/30',
    success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    live: 'bg-kiai-500/15 text-kiai-300 border-kiai-500/40',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        tones[tone],
      )}
    >
      {tone === 'live' && <span className="h-1.5 w-1.5 rounded-full bg-kiai-500 animate-pulse-live" />}
      {children}
    </span>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="font-display text-3xl font-bold text-white not-dark:text-ink-900">{value}</div>
      <div className="mt-1 text-sm font-medium text-ink-300 not-dark:text-ink-500">{label}</div>
      {sub && <div className="text-xs text-ink-500">{sub}</div>}
    </div>
  );
}
