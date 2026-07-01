import type {
  BitokuMember,
  BitokuResult,
  BitokuSchool,
  BushiAthleteInput,
} from './bitoku-types.js';

/** Thrown when the Bitoku client is used without configuration. */
export class NotConfiguredError extends Error {
  constructor(message = 'Bitoku integration is not configured (missing base URL / API key)') {
    super(message);
    this.name = 'NotConfiguredError';
  }
}

/** The Bitoku sync surface Bushi depends on. */
export interface BitokuClient {
  /** Import a full roster (school + members) for a given Bitoku school. */
  importRoster(schoolId: string): Promise<{ school: BitokuSchool; members: BitokuMember[] }>;
  /** Pull current members for a school (incremental sync). */
  syncSchoolMembers(schoolId: string): Promise<BitokuMember[]>;
  /** Push an updated athlete profile back to Bitoku. */
  syncAthleteProfile(profile: BushiAthleteInput): Promise<{ id: string }>;
  /** Push Bushi tournament results into Bitoku. */
  pushResults(results: BitokuResult[]): Promise<{ accepted: number }>;
}

export interface BitokuConfig {
  baseUrl?: string;
  apiKey?: string;
}

/**
 * HTTP-backed Bitoku client stub. Every method throws `NotConfiguredError`
 * until both `baseUrl` and `apiKey` are provided; the request shapes below show
 * how the real endpoints will be called once Bitoku exposes them.
 */
export class HttpBitokuClient implements BitokuClient {
  constructor(private readonly config: BitokuConfig = {}) {}

  private ensureConfigured(): { baseUrl: string; apiKey: string } {
    const { baseUrl, apiKey } = this.config;
    if (!baseUrl || !apiKey) throw new NotConfiguredError();
    return { baseUrl, apiKey };
  }

  private authHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async importRoster(
    schoolId: string,
  ): Promise<{ school: BitokuSchool; members: BitokuMember[] }> {
    const { baseUrl, apiKey } = this.ensureConfigured();
    const res = await fetch(`${baseUrl}/schools/${encodeURIComponent(schoolId)}/roster`, {
      headers: this.authHeaders(apiKey),
    });
    if (!res.ok) throw new Error(`Bitoku importRoster failed (${res.status})`);
    return (await res.json()) as { school: BitokuSchool; members: BitokuMember[] };
  }

  async syncSchoolMembers(schoolId: string): Promise<BitokuMember[]> {
    const { baseUrl, apiKey } = this.ensureConfigured();
    const res = await fetch(`${baseUrl}/schools/${encodeURIComponent(schoolId)}/members`, {
      headers: this.authHeaders(apiKey),
    });
    if (!res.ok) throw new Error(`Bitoku syncSchoolMembers failed (${res.status})`);
    return (await res.json()) as BitokuMember[];
  }

  async syncAthleteProfile(profile: BushiAthleteInput): Promise<{ id: string }> {
    const { baseUrl, apiKey } = this.ensureConfigured();
    const res = await fetch(`${baseUrl}/members/${encodeURIComponent(profile.externalId)}`, {
      method: 'PUT',
      headers: this.authHeaders(apiKey),
      body: JSON.stringify(profile),
    });
    if (!res.ok) throw new Error(`Bitoku syncAthleteProfile failed (${res.status})`);
    return (await res.json()) as { id: string };
  }

  async pushResults(results: BitokuResult[]): Promise<{ accepted: number }> {
    const { baseUrl, apiKey } = this.ensureConfigured();
    const res = await fetch(`${baseUrl}/results`, {
      method: 'POST',
      headers: this.authHeaders(apiKey),
      body: JSON.stringify({ results }),
    });
    if (!res.ok) throw new Error(`Bitoku pushResults failed (${res.status})`);
    return (await res.json()) as { accepted: number };
  }
}
