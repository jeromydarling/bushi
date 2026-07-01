import type { Competitor } from './types.js';

/** Next power of two >= n (minimum 1). */
export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  return 2 ** Math.ceil(Math.log2(n));
}

/**
 * Standard tournament seeding order for a bracket of `size` (a power of two).
 * Returns an array of seed numbers (1-based) in slot order such that the top
 * seeds are maximally separated (1 plays 2 only in the final). Classic
 * "fold" construction.
 *
 * size 4 -> [1, 4, 3, 2]
 * size 8 -> [1, 8, 5, 4, 3, 6, 7, 2]
 */
export function seedOrder(size: number): number[] {
  let rounds = Math.log2(size);
  if (!Number.isInteger(rounds)) {
    throw new Error(`seedOrder requires a power of two, got ${size}`);
  }
  let order = [1, 2];
  for (let r = 1; r < rounds; r++) {
    const sum = order.length * 2 + 1;
    const next: number[] = [];
    for (const s of order) {
      next.push(s);
      next.push(sum - s);
    }
    order = next;
  }
  return order;
}

/**
 * Order competitors by seed, then by a deterministic tiebreak. Competitors from
 * the same school are nudged apart so teammates don't meet in round one where it
 * can be avoided. Unseeded competitors sort after seeded ones.
 */
export function orderCompetitors(competitors: Competitor[], seed = 0): Competitor[] {
  const withIndex = competitors.map((c, i) => ({ c, i }));
  withIndex.sort((x, y) => {
    const sx = x.c.seed ?? Number.MAX_SAFE_INTEGER;
    const sy = y.c.seed ?? Number.MAX_SAFE_INTEGER;
    if (sx !== sy) return sx - sy;
    // Deterministic pseudo-shuffle for equal seeds using the injected seed.
    const hx = hash(x.c.id, seed);
    const hy = hash(y.c.id, seed);
    if (hx !== hy) return hx - hy;
    return x.i - y.i;
  });
  return withIndex.map((w) => w.c);
}

function hash(id: string, seed: number): number {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
