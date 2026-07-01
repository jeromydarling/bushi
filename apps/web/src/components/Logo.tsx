import { cn } from '../lib/cn.js';

/**
 * Bushi mark — a sharp, geometric "torii-meets-bracket" glyph plus wordmark.
 * Deliberately abstract: no dragons, no cartoon samurai.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-7 w-7', className)} fill="none" aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="7" className="fill-ink-900 not-dark:fill-ink-900" />
      <path d="M8 10 H24" stroke="#e8481a" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M11 10 V23" stroke="#f6f7f8" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M21 10 V23" stroke="#f6f7f8" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M11 16 H16 V23" stroke="#4189bd" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className, subtle }: { className?: string; subtle?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="flex items-baseline gap-1.5">
        <span className="font-display text-lg font-bold tracking-tight text-white not-dark:text-ink-900">
          Bushi
        </span>
        <span className={cn('font-jp text-sm font-bold text-kiai-400', subtle && 'opacity-70')}>武士</span>
      </span>
    </span>
  );
}
