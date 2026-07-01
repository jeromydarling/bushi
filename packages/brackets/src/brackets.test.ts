import { describe, expect, it } from 'vitest';
import {
  champion,
  generateBracket,
  generateSingleElimination,
  nextPowerOfTwo,
  recordResult,
  seedOrder,
  standings,
} from './index.js';
import type { Competitor } from './types.js';

function field(n: number): Competitor[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `c${i + 1}`,
    name: `Competitor ${i + 1}`,
    seed: i + 1,
  }));
}

describe('seeding helpers', () => {
  it('computes next power of two', () => {
    expect(nextPowerOfTwo(1)).toBe(1);
    expect(nextPowerOfTwo(3)).toBe(4);
    expect(nextPowerOfTwo(5)).toBe(8);
    expect(nextPowerOfTwo(8)).toBe(8);
    expect(nextPowerOfTwo(9)).toBe(16);
  });

  it('produces a valid seed order (a permutation with balanced pairs)', () => {
    for (const size of [2, 4, 8, 16]) {
      const order = seedOrder(size);
      // It is a permutation of 1..size.
      expect([...order].sort((a, b) => a - b)).toEqual(
        Array.from({ length: size }, (_, i) => i + 1),
      );
      // Top seed leads; each first-round pair sums to size + 1 (top vs bottom).
      expect(order[0]).toBe(1);
      for (let i = 0; i < order.length; i += 2) {
        expect(order[i]! + order[i + 1]!).toBe(size + 1);
      }
    }
  });
});

describe('single elimination', () => {
  it('builds a full power-of-two bracket', () => {
    const b = generateSingleElimination(field(8));
    expect(b.rounds).toBe(3);
    // 4 + 2 + 1 = 7 matches
    expect(b.matches).toHaveLength(7);
    expect(b.matches.filter((m) => m.round === 1)).toHaveLength(4);
    expect(b.matches.find((m) => m.label === 'Final')).toBeDefined();
  });

  it('places the top two seeds in opposite halves (can only meet in the final)', () => {
    const b = generateSingleElimination(field(8));
    const r1 = b.matches.filter((m) => m.round === 1);
    // Top seed always anchors the very first slot of the bracket.
    expect(r1[0]!.competitorA).toBe('c1');
    // Seed 1 is in the top half; seed 2 must be in the bottom half so they
    // cannot meet before the final.
    const half = r1.length / 2;
    const seed1Match = r1.findIndex((m) => m.competitorA === 'c1' || m.competitorB === 'c1');
    const seed2Match = r1.findIndex((m) => m.competitorA === 'c2' || m.competitorB === 'c2');
    expect(seed1Match).toBeLessThan(half);
    expect(seed2Match).toBeGreaterThanOrEqual(half);
  });

  it('inserts byes for non power-of-two fields and auto-advances', () => {
    const b = generateSingleElimination(field(5));
    expect(b.rounds).toBe(3); // size 8
    // Top seeds get byes and should already be advanced into round 2.
    const round2 = b.matches.filter((m) => m.round === 2);
    const advanced = round2.filter((m) => m.competitorA || m.competitorB);
    expect(advanced.length).toBeGreaterThan(0);
  });

  it('handles a single competitor', () => {
    const b = generateSingleElimination(field(1));
    expect(b.matches).toHaveLength(1);
    expect(champion(b)).toBe('c1');
  });

  it('cascades results to a champion', () => {
    let b = generateSingleElimination(field(4));
    const r1 = b.matches.filter((m) => m.round === 1);
    b = recordResult(b, r1[0]!.id, r1[0]!.competitorA!);
    b = recordResult(b, r1[1]!.id, r1[1]!.competitorA!);
    const finalMatch = b.matches.find((m) => m.label === 'Final')!;
    expect(finalMatch.competitorA).toBe(r1[0]!.competitorA);
    expect(finalMatch.competitorB).toBe(r1[1]!.competitorA);
    b = recordResult(b, finalMatch.id, finalMatch.competitorA!);
    expect(champion(b)).toBe(finalMatch.competitorA);
  });

  it('adds a bronze match when requested', () => {
    const b = generateSingleElimination(field(4), { thirdPlace: true });
    expect(b.thirdPlaceMatchId).toBe('m-bronze');
    expect(b.matches.find((m) => m.label === 'Bronze')).toBeDefined();
  });

  it('rejects a winner who did not play the match', () => {
    const b = generateSingleElimination(field(4));
    const r1 = b.matches.filter((m) => m.round === 1);
    expect(() => recordResult(b, r1[0]!.id, 'c99')).toThrow();
  });
});

describe('round robin', () => {
  it('schedules every pairing once', () => {
    const b = generateBracket(field(4), { format: 'round_robin' });
    // n*(n-1)/2 = 6
    expect(b.matches).toHaveLength(6);
    expect(b.rounds).toBe(3);
  });

  it('drops bye matches for odd fields', () => {
    const b = generateBracket(field(5), { format: 'round_robin' });
    // 5*4/2 = 10 real matches across 5 rounds
    expect(b.matches).toHaveLength(10);
    expect(b.rounds).toBe(5);
  });

  it('computes standings from results', () => {
    const b = generateBracket(field(3), { format: 'round_robin' });
    const results = b.matches.map((m) => ({
      matchId: m.id,
      winnerId: m.competitorA!,
    }));
    const table = standings(b, results);
    expect(table).toHaveLength(3);
    const total = table.reduce((sum, s) => sum + s.wins, 0);
    expect(total).toBe(3); // three matches, three winners
  });
});
