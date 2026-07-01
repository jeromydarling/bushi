/**
 * Shared shapes for live scoring — used by both the MatRoomDO (server) and the
 * scorekeeper / referee / display / spectator UIs (client). Keeping these in the
 * domain package guarantees the wire protocol stays in sync across surfaces.
 */

export interface Fighter {
  id: string;
  name: string;
  school?: string;
  seed?: number;
  color: 'red' | 'blue';
}

export interface MatchClock {
  running: boolean;
  /** Remaining seconds in the current period. */
  remainingSeconds: number;
  periodLengthSeconds: number;
  period: number;
  totalPeriods: number;
  /** Epoch ms captured when the clock last started; null when paused. */
  startedAt: number | null;
}

export interface LiveScore {
  a: number;
  b: number;
  penaltiesA: number;
  penaltiesB: number;
}

export interface LiveMatchState {
  matchId: string;
  matNumber: number;
  divisionName: string;
  status: 'pending' | 'ready' | 'live' | 'completed' | 'no_contest';
  fighters: { a: Fighter; b: Fighter };
  score: LiveScore;
  clock: MatchClock;
  result: { winner: 'a' | 'b' | 'draw'; method: string } | null;
  /** Monotonic version — clients drop out-of-order frames. */
  version: number;
  updatedAt: number;
}

/** Server -> client frames broadcast over the WebSocket. */
export type MatRoomServerMessage =
  | { type: 'state'; state: LiveMatchState }
  | { type: 'presence'; scorekeepers: number; spectators: number }
  | { type: 'error'; message: string };

export function emptyLiveScore(): LiveScore {
  return { a: 0, b: 0, penaltiesA: 0, penaltiesB: 0 };
}
