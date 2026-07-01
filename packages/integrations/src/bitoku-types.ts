/**
 * Bitoku integration DTOs.
 *
 * Bitoku is a Lovable-built school management system. This package is
 * integration-readiness only: clean interfaces + stubs so the Worker can wire a
 * real Bitoku instance later without reshaping call sites. No live calls happen
 * until a base URL + API key are configured.
 */

import type { MartialArtStyle } from '@bushi/domain';

export interface BitokuSchool {
  id: string;
  name: string;
  styles: string[];
  city?: string;
  country?: string;
  contactEmail?: string;
}

export interface BitokuMember {
  id: string;
  schoolId: string;
  firstName: string;
  lastName: string;
  email?: string;
  rank?: string;
  primaryStyle?: string;
  dateOfBirth?: string;
}

export interface BitokuResult {
  id: string;
  memberId: string;
  eventName: string;
  placement: number;
  division: string;
  recordedAt: string;
}

/** Bushi-side normalized shapes produced by the mapping layer. */
export interface BushiSchoolInput {
  externalId: string;
  name: string;
  styles: MartialArtStyle[];
  city: string | null;
  country: string | null;
  contactEmail: string | null;
}

export interface BushiAthleteInput {
  externalId: string;
  schoolExternalId: string;
  fullName: string;
  email: string | null;
  rank: string | null;
  primaryStyle: MartialArtStyle | null;
  dateOfBirth: string | null;
}

export interface BushiResultInput {
  externalId: string;
  athleteExternalId: string;
  eventName: string;
  placement: number;
  division: string;
  recordedAt: string;
}
