import { describe, expect, it } from 'vitest';
import { registrationSchema, scoringEventSchema, signupSchema, slugify } from './index.js';

describe('slugify', () => {
  it('produces url-safe slugs', () => {
    expect(slugify('Bushi Summer Open 2026!')).toBe('bushi-summer-open-2026');
    expect(slugify('  Ronin  Academy  ')).toBe('ronin-academy');
  });
});

describe('signup validation', () => {
  it('requires a strong-enough password', () => {
    expect(signupSchema.safeParse({ email: 'a@b.com', password: 'short', fullName: 'A' }).success).toBe(false);
    expect(
      signupSchema.safeParse({ email: 'a@b.com', password: 'longenoughpw', fullName: 'Ada Lovelace' }).success,
    ).toBe(true);
  });
});

describe('registration validation', () => {
  it('demands the waiver be accepted', () => {
    const base = { tournamentId: crypto.randomUUID(), athleteId: crypto.randomUUID(), divisionIds: [crypto.randomUUID()] };
    expect(registrationSchema.safeParse({ ...base, waiverAccepted: false }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...base, waiverAccepted: true }).success).toBe(true);
  });

  it('requires at least one division', () => {
    expect(
      registrationSchema.safeParse({
        tournamentId: crypto.randomUUID(),
        athleteId: crypto.randomUUID(),
        divisionIds: [],
        waiverAccepted: true,
      }).success,
    ).toBe(false);
  });
});

describe('scoring events', () => {
  it('accepts valid events and rejects malformed ones', () => {
    expect(scoringEventSchema.safeParse({ type: 'score', participant: 'a', points: 3 }).success).toBe(true);
    expect(scoringEventSchema.safeParse({ type: 'timer', action: 'start' }).success).toBe(true);
    expect(scoringEventSchema.safeParse({ type: 'result', winner: 'b', method: 'submission' }).success).toBe(true);
    // Out-of-range points.
    expect(scoringEventSchema.safeParse({ type: 'score', participant: 'a', points: 99 }).success).toBe(false);
    // Unknown participant.
    expect(scoringEventSchema.safeParse({ type: 'penalty', participant: 'c', amount: 1 }).success).toBe(false);
  });
});
