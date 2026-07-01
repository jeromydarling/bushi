/**
 * Core domain enumerations shared across the API, web app, and packages.
 * These are the single source of truth for roles, statuses, and styles.
 */

export const ROLES = [
  'platform_admin',
  'organizer',
  'school_admin',
  'coach',
  'referee',
  'scorekeeper',
  'competitor',
  'spectator',
] as const;
export type Role = (typeof ROLES)[number];

/** Roles that may operate inside the organizer command center. */
export const STAFF_ROLES: Role[] = [
  'platform_admin',
  'organizer',
  'referee',
  'scorekeeper',
];

export const TOURNAMENT_STATUSES = [
  'draft',
  'published',
  'registration_open',
  'registration_closed',
  'live',
  'completed',
  'archived',
] as const;
export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];

export const MARTIAL_ARTS_STYLES = [
  'karate',
  'taekwondo',
  'bjj',
  'judo',
  'kickboxing',
  'mma_amateur',
  'open_mixed',
] as const;
export type MartialArtStyle = (typeof MARTIAL_ARTS_STYLES)[number];

export const STYLE_LABELS: Record<MartialArtStyle, string> = {
  karate: 'Karate',
  taekwondo: 'Taekwondo',
  bjj: 'Brazilian Jiu-Jitsu',
  judo: 'Judo',
  kickboxing: 'Kickboxing',
  mma_amateur: 'Amateur MMA',
  open_mixed: 'Open / Mixed Rules',
};

export const BRACKET_FORMATS = [
  'single_elimination',
  'round_robin',
  'pool_to_bracket',
] as const;
export type BracketFormat = (typeof BRACKET_FORMATS)[number];

export const MATCH_STATUSES = [
  'pending',
  'ready',
  'live',
  'completed',
  'no_contest',
] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const DIVISION_ENTRY_STATUSES = [
  'registered',
  'checked_in',
  'weighed_in',
  'no_show',
  'scratched',
  'withdrawn',
] as const;
export type DivisionEntryStatus = (typeof DIVISION_ENTRY_STATUSES)[number];

export const REGISTRATION_STATUSES = [
  'pending',
  'awaiting_payment',
  'confirmed',
  'waitlisted',
  'cancelled',
  'refunded',
] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const SUBSCRIPTION_TIERS = ['free', 'starter', 'pro', 'enterprise'] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

/** Belt / rank systems vary by style; we store a normalized ordinal + label. */
export const BELT_SYSTEMS: Record<string, string[]> = {
  bjj: ['White', 'Blue', 'Purple', 'Brown', 'Black'],
  karate: [
    'White',
    'Yellow',
    'Orange',
    'Green',
    'Blue',
    'Purple',
    'Brown',
    'Black',
  ],
  taekwondo: [
    'White',
    'Yellow',
    'Green',
    'Blue',
    'Red',
    'Black',
  ],
  judo: ['White', 'Yellow', 'Orange', 'Green', 'Blue', 'Brown', 'Black'],
};
