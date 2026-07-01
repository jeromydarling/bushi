import {
  MARTIAL_ARTS_STYLES,
  type MartialArtStyle,
} from '@bushi/domain';
import type {
  BitokuMember,
  BitokuResult,
  BitokuSchool,
  BushiAthleteInput,
  BushiResultInput,
  BushiSchoolInput,
} from './bitoku-types.js';

/** Best-effort map of a free-form style string onto a Bushi MartialArtStyle. */
export function normalizeStyle(raw: string): MartialArtStyle | null {
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  const direct = MARTIAL_ARTS_STYLES.find((s) => s === key);
  if (direct) return direct;
  const aliases: Record<string, MartialArtStyle> = {
    jiu_jitsu: 'bjj',
    bjj: 'bjj',
    brazilian_jiu_jitsu: 'bjj',
    tae_kwon_do: 'taekwondo',
    tkd: 'taekwondo',
    muay_thai: 'kickboxing',
    mma: 'mma_amateur',
    mixed: 'open_mixed',
    open: 'open_mixed',
  };
  return aliases[key] ?? null;
}

export function mapSchool(school: BitokuSchool): BushiSchoolInput {
  const styles = school.styles
    .map(normalizeStyle)
    .filter((s): s is MartialArtStyle => s !== null);
  return {
    externalId: school.id,
    name: school.name,
    styles,
    city: school.city ?? null,
    country: school.country ?? null,
    contactEmail: school.contactEmail ?? null,
  };
}

export function mapMember(member: BitokuMember): BushiAthleteInput {
  return {
    externalId: member.id,
    schoolExternalId: member.schoolId,
    fullName: `${member.firstName} ${member.lastName}`.trim(),
    email: member.email ?? null,
    rank: member.rank ?? null,
    primaryStyle: member.primaryStyle ? normalizeStyle(member.primaryStyle) : null,
    dateOfBirth: member.dateOfBirth ?? null,
  };
}

export function mapResult(result: BitokuResult): BushiResultInput {
  return {
    externalId: result.id,
    athleteExternalId: result.memberId,
    eventName: result.eventName,
    placement: result.placement,
    division: result.division,
    recordedAt: result.recordedAt,
  };
}
