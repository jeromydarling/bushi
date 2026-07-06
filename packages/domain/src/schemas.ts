import { z } from 'zod';
import {
  BRACKET_FORMATS,
  INTERACTION_KINDS,
  LIFECYCLE_STAGES,
  MARTIAL_ARTS_STYLES,
  ROLES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TOURNAMENT_STATUSES,
} from './constants.js';

/** A reusable slug validator — lowercase, url-safe, used for public pages. */
export const slugSchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be a lowercase url-safe slug');

export const emailSchema = z.string().email().max(254).toLowerCase();

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const signupSchema = z.object({
  email: emailSchema,
  password: z.string().min(10).max(200),
  fullName: z.string().min(1).max(120),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const inviteSchema = z.object({
  email: emailSchema,
  role: z.enum(ROLES),
  organizationId: z.string().uuid().optional(),
});
export type InviteInput = z.infer<typeof inviteSchema>;

// ---------------------------------------------------------------------------
// Organizations & schools
// ---------------------------------------------------------------------------

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(120),
  slug: slugSchema,
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const createSchoolSchema = z.object({
  name: z.string().min(2).max(120),
  slug: slugSchema,
  styles: z.array(z.enum(MARTIAL_ARTS_STYLES)).min(1),
  city: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
  country: z.string().max(2).optional(),
  bio: z.string().max(2000).optional(),
});
export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;

export const createAthleteSchema = z.object({
  schoolId: z.string().uuid(),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  dateOfBirth: z.string().date().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  weightKg: z.number().positive().max(400).optional(),
  primaryStyle: z.enum(MARTIAL_ARTS_STYLES).optional(),
  beltRank: z.string().max(40).optional(),
});
export type CreateAthleteInput = z.infer<typeof createAthleteSchema>;

// ---------------------------------------------------------------------------
// Tournaments
// ---------------------------------------------------------------------------

export const createTournamentSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(2).max(160),
  slug: slugSchema,
  styles: z.array(z.enum(MARTIAL_ARTS_STYLES)).min(1),
  startDate: z.string().date(),
  endDate: z.string().date().optional(),
  venueName: z.string().max(160).optional(),
  city: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
  country: z.string().max(2).optional(),
  description: z.string().max(4000).optional(),
});
export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;

export const updateTournamentStatusSchema = z.object({
  status: z.enum(TOURNAMENT_STATUSES),
});

export const createDivisionSchema = z.object({
  tournamentId: z.string().uuid(),
  name: z.string().min(1).max(160),
  style: z.enum(MARTIAL_ARTS_STYLES),
  format: z.enum(BRACKET_FORMATS).default('single_elimination'),
  ageMin: z.number().int().min(0).max(120).optional(),
  ageMax: z.number().int().min(0).max(120).optional(),
  weightMinKg: z.number().positive().max(400).optional(),
  weightMaxKg: z.number().positive().max(400).optional(),
  beltRank: z.string().max(40).optional(),
  gender: z.enum(['male', 'female', 'coed']).optional(),
  cap: z.number().int().positive().max(1024).optional(),
});
export type CreateDivisionInput = z.infer<typeof createDivisionSchema>;

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export const registrationSchema = z.object({
  tournamentId: z.string().uuid(),
  athleteId: z.string().uuid(),
  divisionIds: z.array(z.string().uuid()).min(1),
  discountCode: z.string().max(40).optional(),
  waiverAccepted: z.literal(true),
});
export type RegistrationInput = z.infer<typeof registrationSchema>;

// ---------------------------------------------------------------------------
// Discovery (Perplexity-sourced external tournaments)
// ---------------------------------------------------------------------------

/** One tournament as extracted from a web search by Perplexity. */
export const discoveredTournamentSchema = z.object({
  name: z.string().min(3).max(200),
  startDate: z.string().min(4).max(40), // free-form; normalized downstream
  endDate: z.string().max(40).optional(),
  city: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  styles: z.array(z.enum(MARTIAL_ARTS_STYLES)).default([]),
  organizer: z.string().max(200).optional(),
  sourceUrl: z.string().url().max(600).optional(),
  registrationUrl: z.string().url().max(600).optional(),
});
export type DiscoveredTournamentInput = z.infer<typeof discoveredTournamentSchema>;

/** Perplexity is asked to return `{ tournaments: [...] }`. */
export const discoveryResponseSchema = z.object({
  tournaments: z.array(discoveredTournamentSchema).max(50),
});

// ---------------------------------------------------------------------------
// CRM (super-admin)
// ---------------------------------------------------------------------------

export const createInteractionSchema = z.object({
  kind: z.enum(INTERACTION_KINDS),
  subject: z.string().max(200).optional(),
  body: z.string().min(1).max(8000),
  followUpAt: z.number().int().optional(), // epoch ms
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  dueAt: z.number().int().optional(),
});

export const updateTaskSchema = z.object({
  status: z.enum(['open', 'done']),
});

export const createTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().max(8000).optional(),
  priority: z.enum(TICKET_PRIORITIES).default('normal'),
});

export const updateTicketSchema = z.object({
  status: z.enum(TICKET_STATUSES),
});

export const updateCustomerSchema = z.object({
  lifecycleStage: z.enum(LIFECYCLE_STAGES).optional(),
  ownerUserId: z.string().optional(),
  mrrCents: z.number().int().min(0).optional(),
  tags: z.array(z.string().max(40)).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

// ---------------------------------------------------------------------------
// Live scoring events (client -> MatRoomDO)
// ---------------------------------------------------------------------------

export const scoringEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('score'), participant: z.enum(['a', 'b']), points: z.number().int().min(-10).max(10) }),
  z.object({ type: z.literal('penalty'), participant: z.enum(['a', 'b']), amount: z.number().int().min(1).max(5) }),
  z.object({ type: z.literal('timer'), action: z.enum(['start', 'pause', 'reset', 'set']), seconds: z.number().int().min(0).max(3600).optional() }),
  z.object({ type: z.literal('period'), action: z.enum(['next', 'previous']) }),
  z.object({ type: z.literal('result'), winner: z.enum(['a', 'b', 'draw']), method: z.string().max(60) }),
  z.object({ type: z.literal('reset_match') }),
]);
export type ScoringEvent = z.infer<typeof scoringEventSchema>;
