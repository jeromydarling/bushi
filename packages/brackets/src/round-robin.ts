import type { Bracket, BracketMatch, Competitor, MatchResult } from './types.js';
import { orderCompetitors } from './seeding.js';

/**
 * Round-robin schedule via the circle method. Every competitor faces every
 * other exactly once. If there is an odd number of competitors a "bye" phantom
 * is added and those matches are dropped.
 */
export function generateRoundRobin(
  competitors: Competitor[],
  opts: { seed?: number } = {},
): Bracket {
  const ordered = orderCompetitors(competitors, opts.seed ?? 0);
  const ids = ordered.map((c) => c.id);
  const hasBye = ids.length % 2 !== 0;
  const wheel = hasBye ? [...ids, '__bye__'] : [...ids];
  const n = wheel.length;
  const rounds = n - 1;
  const half = n / 2;

  const matches: BracketMatch[] = [];
  let fixed = wheel[0]!;
  let rotating = wheel.slice(1);

  for (let round = 0; round < rounds; round++) {
    const roundIds = [fixed, ...rotating];
    for (let i = 0; i < half; i++) {
      const a = roundIds[i]!;
      const b = roundIds[n - 1 - i]!;
      if (a === '__bye__' || b === '__bye__') continue;
      matches.push({
        id: `rr-r${round + 1}-${i}`,
        round: round + 1,
        order: i,
        a: { kind: 'competitor', competitorId: a },
        b: { kind: 'competitor', competitorId: b },
        competitorA: a,
        competitorB: b,
        winnerId: null,
        loserId: null,
        label: `Round ${round + 1}`,
      });
    }
    // rotate
    rotating = [rotating[rotating.length - 1]!, ...rotating.slice(0, -1)];
  }

  return {
    format: 'round_robin',
    competitorCount: ordered.length,
    rounds,
    matches,
    thirdPlaceMatchId: null,
  };
}

export interface Standing {
  competitorId: string;
  played: number;
  wins: number;
  losses: number;
  points: number;
}

/**
 * Compute standings from recorded results. 3 points per win (draws unsupported
 * in elimination arts; a null winner just means "not yet played"). Ties are left
 * in input order for the caller to break with head-to-head if desired.
 */
export function standings(bracket: Bracket, results: MatchResult[]): Standing[] {
  const table = new Map<string, Standing>();
  const ensure = (id: string) => {
    let s = table.get(id);
    if (!s) {
      s = { competitorId: id, played: 0, wins: 0, losses: 0, points: 0 };
      table.set(id, s);
    }
    return s;
  };

  for (const m of bracket.matches) {
    if (m.competitorA) ensure(m.competitorA);
    if (m.competitorB) ensure(m.competitorB);
  }

  const resultById = new Map(results.map((r) => [r.matchId, r]));
  for (const m of bracket.matches) {
    const r = resultById.get(m.id);
    if (!r || !m.competitorA || !m.competitorB) continue;
    const winner = ensure(r.winnerId);
    const loserId = r.winnerId === m.competitorA ? m.competitorB : m.competitorA;
    const loser = ensure(loserId);
    winner.played++;
    loser.played++;
    winner.wins++;
    loser.losses++;
    winner.points += 3;
  }

  return [...table.values()].sort((a, b) => b.points - a.points || b.wins - a.wins);
}
