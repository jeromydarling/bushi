import { Badge } from './ui.js';
import { cn } from '../lib/cn.js';

export interface BracketSlot {
  name: string;
  score?: number;
  winner?: boolean;
}
export interface BracketMatch {
  label: string;
  a: BracketSlot;
  b: BracketSlot;
  live?: boolean;
}

/** A compact, column-per-round single-elimination bracket. */
export function BracketView({ rounds }: { rounds: { title: string; matches: BracketMatch[] }[] }) {
  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {rounds.map((round) => (
        <div key={round.title} className="flex min-w-[220px] flex-1 flex-col justify-around gap-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">{round.title}</div>
          {round.matches.map((m, i) => (
            <div
              key={i}
              className="rounded-xl border border-ink-800 bg-ink-900/60 not-dark:border-ink-200 not-dark:bg-white"
            >
              <div className="flex items-center justify-between px-3 pt-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{m.label}</span>
                {m.live && <Badge tone="live">Live</Badge>}
              </div>
              <SlotRow slot={m.a} />
              <div className="mx-3 h-px bg-ink-800 not-dark:bg-ink-200" />
              <SlotRow slot={m.b} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SlotRow({ slot }: { slot: BracketSlot }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span
        className={cn(
          'truncate text-sm',
          slot.winner ? 'font-semibold text-white not-dark:text-ink-900' : 'text-ink-300',
        )}
      >
        {slot.name}
      </span>
      <span
        className={cn(
          'ml-2 font-mono text-sm',
          slot.winner ? 'text-kiai-400' : 'text-ink-500',
        )}
      >
        {slot.score ?? '—'}
      </span>
    </div>
  );
}
