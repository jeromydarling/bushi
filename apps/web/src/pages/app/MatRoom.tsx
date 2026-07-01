import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { LiveMatchState } from '@bushi/domain';
import { Badge, Button } from '../../components/ui.js';
import { Logo } from '../../components/Logo.js';
import { useMatRoom } from '../../hooks/useMatRoom.js';
import { cn } from '../../lib/cn.js';
import { useSeo } from '../../lib/seo.js';

type View = 'scorekeeper' | 'referee' | 'display' | 'public';

export function MatRoom() {
  const { id, mat } = useParams();
  useSeo(`Mat ${mat ?? 1} · Live scoring · Bushi`);
  const [view, setView] = useState<View>('scorekeeper');
  const matchId = `${id ?? 'tour-summer'}-mat-${mat ?? 1}`;
  const { state, live, send } = useMatRoom(matchId, view === 'public' ? 'spectator' : view);

  return (
    <div className="min-h-screen bg-ink-950 not-dark:bg-ink-50">
      <header className="flex items-center justify-between border-b border-ink-800/80 px-5 py-3 not-dark:border-ink-200">
        <div className="flex items-center gap-4">
          <Link to={`/app/tournaments/${id ?? 'tour-summer'}`}><Logo /></Link>
          <span className="hidden text-sm text-ink-500 sm:inline">Mat {mat ?? 1} · {state.divisionName}</span>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={live ? 'success' : 'neutral'}>{live ? 'Connected' : 'Simulator'}</Badge>
          <div className="flex rounded-lg border border-ink-800 p-0.5 not-dark:border-ink-200">
            {(['scorekeeper', 'referee', 'display', 'public'] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                  view === v ? 'bg-kiai-500 text-white' : 'text-ink-400 hover:text-white not-dark:hover:text-ink-900',
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl p-5 sm:p-8">
        <Scoreboard state={state} big={view === 'display' || view === 'public'} />

        {(view === 'scorekeeper' || view === 'referee') && (
          <Controls view={view} send={send} state={state} />
        )}

        {view === 'public' && (
          <p className="mt-8 text-center text-sm text-ink-500">
            You’re watching live. Scores update in real time — no refresh, no account.
          </p>
        )}
      </div>
    </div>
  );
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function Scoreboard({ state, big }: { state: LiveMatchState; big?: boolean }) {
  const { fighters, score, clock, result } = state;
  return (
    <div className="rounded-2xl border border-ink-800/80 bg-ink-900/60 p-6 not-dark:border-ink-200 not-dark:bg-white">
      <div className="mb-4 flex items-center justify-center gap-3">
        {state.status === 'live' && <Badge tone="live">Live</Badge>}
        <span className={cn('font-mono font-bold tabular-nums text-white not-dark:text-ink-900', big ? 'text-6xl sm:text-8xl' : 'text-4xl')}>
          {fmt(clock.remainingSeconds)}
        </span>
        <span className="text-sm text-ink-500">P{clock.period}/{clock.totalPeriods}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Corner name={fighters.a.name} school={fighters.a.school} score={score.a} penalties={score.penaltiesA} tone="red" big={big} winner={result?.winner === 'a'} />
        <Corner name={fighters.b.name} school={fighters.b.school} score={score.b} penalties={score.penaltiesB} tone="blue" big={big} winner={result?.winner === 'b'} />
      </div>
      {result && (
        <div className="mt-4 rounded-xl bg-kiai-500/10 py-3 text-center text-sm font-semibold text-kiai-300">
          Winner: {result.winner === 'a' ? fighters.a.name : result.winner === 'b' ? fighters.b.name : 'Draw'} · {result.method}
        </div>
      )}
    </div>
  );
}

function Corner({ name, school, score, penalties, tone, big, winner }: { name: string; school?: string; score: number; penalties: number; tone: 'red' | 'blue'; big?: boolean; winner?: boolean }) {
  // Static class names so Tailwind's JIT can see them.
  const frame = tone === 'red' ? 'border-kiai-500/40 bg-kiai-500/5' : 'border-steel-500/40 bg-steel-500/5';
  const label = tone === 'red' ? 'text-kiai-300' : 'text-steel-300';
  return (
    <div className={cn('rounded-xl border p-5 text-center', frame, winner && 'ring-2 ring-kiai-500')}>
      <div className={cn('text-xs font-semibold uppercase tracking-wide', label)}>{tone}</div>
      <div className={cn('font-display font-bold text-white not-dark:text-ink-900', big ? 'text-8xl sm:text-9xl' : 'text-6xl')}>{score}</div>
      <div className="mt-1 truncate text-sm font-medium text-ink-200 not-dark:text-ink-700">{name}</div>
      {school && <div className="truncate text-xs text-ink-500">{school}</div>}
      {penalties > 0 && <div className="mt-1 text-xs text-amber-400">Penalties: {penalties}</div>}
    </div>
  );
}

function Controls({ view, send, state }: { view: View; send: ReturnType<typeof useMatRoom>['send']; state: LiveMatchState }) {
  const big = view === 'referee';
  return (
    <div className="mt-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {(['a', 'b'] as const).map((p) => (
          <div key={p} className="rounded-xl border border-ink-800 p-4 not-dark:border-ink-200">
            <div className="mb-3 text-center text-xs font-semibold uppercase text-ink-500">
              {p === 'a' ? state.fighters.a.name : state.fighters.b.name}
            </div>
            <div className={cn('grid gap-2', big ? 'grid-cols-3' : 'grid-cols-4')}>
              {[1, 2, 3].map((pts) => (
                <button
                  key={pts}
                  onClick={() => send({ type: 'score', participant: p, points: pts })}
                  className={cn('rounded-lg bg-ink-800 font-bold text-white transition-colors hover:bg-kiai-500', big ? 'py-6 text-2xl' : 'py-4 text-lg')}
                >
                  +{pts}
                </button>
              ))}
              <button
                onClick={() => send({ type: 'score', participant: p, points: -1 })}
                className={cn('rounded-lg bg-ink-800/60 font-bold text-ink-400 hover:bg-ink-700', big ? 'py-6 text-xl' : 'py-4')}
              >
                −1
              </button>
              {!big && (
                <button
                  onClick={() => send({ type: 'penalty', participant: p, amount: 1 })}
                  className="col-span-4 rounded-lg bg-amber-500/15 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/25"
                >
                  Penalty
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* clock + result */}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => send({ type: 'timer', action: state.clock.running ? 'pause' : 'start' })}>
          {state.clock.running ? '❚❚ Pause' : '▶ Start'} clock
        </Button>
        <Button variant="ghost" onClick={() => send({ type: 'timer', action: 'reset' })}>Reset clock</Button>
        <Button variant="ghost" onClick={() => send({ type: 'reset_match' })}>Reset match</Button>
        <div className="ml-auto flex gap-2">
          <Button onClick={() => send({ type: 'result', winner: 'a', method: 'decision' })}>Winner: Red</Button>
          <Button onClick={() => send({ type: 'result', winner: 'b', method: 'decision' })}>Winner: Blue</Button>
        </div>
      </div>
    </div>
  );
}
