/**
 * Bracket engine types. The engine is pure and deterministic — no I/O, no
 * randomness beyond an injectable seed — so it can be unit-tested exhaustively
 * and reused on the Worker, in the browser, and in background jobs alike.
 */

export type BracketFormat = 'single_elimination' | 'round_robin' | 'pool_to_bracket';

export interface Competitor {
  id: string;
  name: string;
  /** Optional seed (1 = top seed). Unseeded competitors are ordered last. */
  seed?: number;
  /** Same club — used to spread teammates apart on the seeding curve. */
  schoolId?: string;
}

/** A single slot in a match. `null` = a bye; a placeholder = winner of a prior match. */
export type Slot =
  | { kind: 'competitor'; competitorId: string }
  | { kind: 'winner_of'; matchId: string }
  | { kind: 'loser_of'; matchId: string }
  | { kind: 'bye' };

export interface BracketMatch {
  id: string;
  /** 1-based round number. */
  round: number;
  /** Position within the round, 0-based, top to bottom. */
  order: number;
  a: Slot;
  b: Slot;
  /** Resolved competitor ids once known (byes auto-advance). */
  competitorA: string | null;
  competitorB: string | null;
  winnerId: string | null;
  loserId: string | null;
  /** Label such as "Final", "Semifinal", "Bronze". */
  label: string;
}

export interface Bracket {
  format: BracketFormat;
  competitorCount: number;
  rounds: number;
  matches: BracketMatch[];
  /** For round robin: standings are computed from recorded results. */
  thirdPlaceMatchId: string | null;
}

export interface GenerateOptions {
  format: BracketFormat;
  /** Include a 3rd-place (bronze) match for single elimination. */
  thirdPlace?: boolean;
  /** Pool size when format is pool_to_bracket. */
  poolSize?: number;
  /** Deterministic tiebreak seed for otherwise-equal competitors. */
  seed?: number;
}

export interface MatchResult {
  matchId: string;
  winnerId: string;
  /** e.g. "points", "submission", "decision", "no_show", "scratch". */
  method?: string;
}
