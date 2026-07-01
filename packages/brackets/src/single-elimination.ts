import type { Bracket, BracketMatch, Competitor, Slot } from './types.js';
import { nextPowerOfTwo, orderCompetitors, seedOrder } from './seeding.js';

function roundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return 'Final';
  if (fromEnd === 1) return 'Semifinal';
  if (fromEnd === 2) return 'Quarterfinal';
  return `Round ${round}`;
}

/**
 * Build a single-elimination bracket. Byes are inserted for the top seeds when
 * the field is not a power of two, and any match with a bye auto-advances the
 * present competitor immediately.
 */
export function generateSingleElimination(
  competitors: Competitor[],
  opts: { thirdPlace?: boolean; seed?: number } = {},
): Bracket {
  const ordered = orderCompetitors(competitors, opts.seed ?? 0);
  const size = nextPowerOfTwo(ordered.length);
  const totalRounds = Math.max(1, Math.log2(size));
  const order = size === 1 ? [1] : seedOrder(size);

  // Map bracket slots (by seed position) to competitors or byes.
  const slotCompetitors: (Competitor | null)[] = order.map((seedNo) => ordered[seedNo - 1] ?? null);

  const matches: BracketMatch[] = [];

  // Round 1
  const firstRoundMatches = size / 2;
  for (let i = 0; i < firstRoundMatches; i++) {
    const top = slotCompetitors[i * 2] ?? null;
    const bottom = slotCompetitors[i * 2 + 1] ?? null;
    matches.push({
      id: `m-r1-${i}`,
      round: 1,
      order: i,
      a: slotFor(top),
      b: slotFor(bottom),
      competitorA: top?.id ?? null,
      competitorB: bottom?.id ?? null,
      winnerId: null,
      loserId: null,
      label: totalRounds === 1 ? 'Final' : roundLabel(1, totalRounds),
    });
  }

  // Subsequent rounds reference winners of the prior round.
  let prevRoundCount = firstRoundMatches;
  for (let round = 2; round <= totalRounds; round++) {
    const count = prevRoundCount / 2;
    for (let i = 0; i < count; i++) {
      matches.push({
        id: `m-r${round}-${i}`,
        round,
        order: i,
        a: { kind: 'winner_of', matchId: `m-r${round - 1}-${i * 2}` },
        b: { kind: 'winner_of', matchId: `m-r${round - 1}-${i * 2 + 1}` },
        competitorA: null,
        competitorB: null,
        winnerId: null,
        loserId: null,
        label: roundLabel(round, totalRounds),
      });
    }
    prevRoundCount = count;
  }

  let thirdPlaceMatchId: string | null = null;
  if (opts.thirdPlace && totalRounds >= 2) {
    thirdPlaceMatchId = 'm-bronze';
    matches.push({
      id: thirdPlaceMatchId,
      round: totalRounds,
      order: 1,
      a: { kind: 'loser_of', matchId: `m-r${totalRounds - 1}-0` },
      b: { kind: 'loser_of', matchId: `m-r${totalRounds - 1}-1` },
      competitorA: null,
      competitorB: null,
      winnerId: null,
      loserId: null,
      label: 'Bronze',
    });
  }

  const bracket: Bracket = {
    format: 'single_elimination',
    competitorCount: ordered.length,
    rounds: totalRounds,
    matches,
    thirdPlaceMatchId,
  };

  // Auto-advance byes so the bracket is immediately in a consistent state.
  resolveByes(bracket);
  return bracket;
}

function slotFor(c: Competitor | null): Slot {
  return c ? { kind: 'competitor', competitorId: c.id } : { kind: 'bye' };
}

/**
 * Walk the bracket and auto-advance any match where one side is a bye. Repeats
 * until stable so byes cascade through empty branches.
 */
export function resolveByes(bracket: Bracket): void {
  const byId = new Map(bracket.matches.map((m) => [m.id, m]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const m of bracket.matches) {
      if (m.winnerId) continue;
      const aBye = m.a.kind === 'bye';
      const bBye = m.b.kind === 'bye';
      if (aBye && bBye) continue; // dead branch, nothing to advance
      if ((aBye || bBye) && (m.competitorA || m.competitorB)) {
        const winner = m.competitorA ?? m.competitorB;
        if (winner) {
          m.winnerId = winner;
          propagateWinner(bracket, byId, m);
          changed = true;
        }
      }
    }
  }
}

function propagateWinner(
  bracket: Bracket,
  byId: Map<string, BracketMatch>,
  match: BracketMatch,
): void {
  if (!match.winnerId) return;
  const loser =
    match.competitorA && match.competitorB
      ? match.competitorA === match.winnerId
        ? match.competitorB
        : match.competitorA
      : null;
  match.loserId = loser;
  for (const m of bracket.matches) {
    if (m.a.kind === 'winner_of' && m.a.matchId === match.id) {
      m.competitorA = match.winnerId;
    }
    if (m.b.kind === 'winner_of' && m.b.matchId === match.id) {
      m.competitorB = match.winnerId;
    }
    if (loser && m.a.kind === 'loser_of' && m.a.matchId === match.id) {
      m.competitorA = loser;
    }
    if (loser && m.b.kind === 'loser_of' && m.b.matchId === match.id) {
      m.competitorB = loser;
    }
  }
  void byId;
}

/** Record a result and cascade the winner into the next round. */
export function recordResult(
  bracket: Bracket,
  matchId: string,
  winnerId: string,
): Bracket {
  const byId = new Map(bracket.matches.map((m) => [m.id, m]));
  const match = byId.get(matchId);
  if (!match) throw new Error(`Unknown match ${matchId}`);
  if (match.competitorA !== winnerId && match.competitorB !== winnerId) {
    throw new Error(`Winner ${winnerId} is not a participant in ${matchId}`);
  }
  match.winnerId = winnerId;
  propagateWinner(bracket, byId, match);
  return bracket;
}

/** Return the champion once the final is decided, else null. */
export function champion(bracket: Bracket): string | null {
  const final = bracket.matches.find(
    (m) => m.round === bracket.rounds && m.label === 'Final',
  );
  return final?.winnerId ?? null;
}
