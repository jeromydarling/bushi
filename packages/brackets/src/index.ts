import type { Bracket, Competitor, GenerateOptions } from './types.js';
import { generateSingleElimination } from './single-elimination.js';
import { generateRoundRobin } from './round-robin.js';

export * from './types.js';
export * from './seeding.js';
export {
  generateSingleElimination,
  recordResult,
  resolveByes,
  champion,
} from './single-elimination.js';
export { generateRoundRobin, standings } from './round-robin.js';
export type { Standing } from './round-robin.js';

/**
 * Front door to the bracket engine. Given a field and a format, produce a
 * fully-formed bracket. `pool_to_bracket` splits the field into round-robin
 * pools and is scaffolded to hand its qualifiers into a single-elimination
 * bracket (the qualifier wiring is a documented next step).
 */
export function generateBracket(
  competitors: Competitor[],
  opts: GenerateOptions,
): Bracket {
  switch (opts.format) {
    case 'single_elimination':
      return generateSingleElimination(competitors, {
        thirdPlace: opts.thirdPlace,
        seed: opts.seed,
      });
    case 'round_robin':
      return generateRoundRobin(competitors, { seed: opts.seed });
    case 'pool_to_bracket':
      // Scaffold: a single pool behaves as round robin. Multi-pool qualifier
      // seeding into a single-elim playoff is the documented next iteration.
      return generateRoundRobin(competitors, { seed: opts.seed });
    default: {
      const _exhaustive: never = opts.format;
      throw new Error(`Unsupported format: ${String(_exhaustive)}`);
    }
  }
}
