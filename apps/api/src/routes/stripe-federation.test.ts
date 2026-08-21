import { describe, it, expect } from 'vitest';
import { hmacSha256Hex } from '@bushi/payments';
import { stripeFederationRoutes } from './stripe-federation.js';
import type { Env } from '../env.js';

const SECRET = 'test-federation-secret';

/** A D1 stub that explodes on any use — for paths that must not touch the DB,
 *  and for proving a handler failure maps to 502. */
const throwingD1 = {
  prepare(): never {
    throw new Error('DB should not be reached / handler failure');
  },
} as unknown as D1Database;

function makeEnv(overrides: Partial<Env> = {}): Env {
  return { DB: throwingD1, FEDERATION_STRIPE_SECRET: SECRET, ...overrides } as Env;
}

async function post(body: string, env: Env, sig?: string): Promise<Response> {
  return stripeFederationRoutes.request(
    '/federation-in',
    {
      method: 'POST',
      body,
      headers: sig !== undefined ? { 'X-CROS-Federation-Signature': sig } : {},
    },
    env,
  );
}

const benignEnvelope = JSON.stringify({
  hub_event_id: 'hub_evt_1',
  satellite_app: 'bushi',
  // An event type the handler has no case for — verifies the full happy path
  // without needing a database.
  stripe_event: { id: 'evt_1', type: 'ping', created: 1, data: { object: {} } },
  delivered_at: '2026-08-21T00:00:00Z',
});

describe('POST /api/stripe/federation-in', () => {
  it('fails closed with 500 when FEDERATION_STRIPE_SECRET is unset', async () => {
    const res = await post(benignEnvelope, makeEnv({ FEDERATION_STRIPE_SECRET: undefined }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: 'federation_not_configured' });
  });

  it('400s when the signature header is missing', async () => {
    const res = await post(benignEnvelope, makeEnv());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: 'missing_federation_signature' });
  });

  it('400s on a wrong signature', async () => {
    const res = await post(benignEnvelope, makeEnv(), await hmacSha256Hex('wrong-secret', benignEnvelope));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: 'invalid_federation_signature' });
  });

  it('rejects a valid signature over different bytes', async () => {
    const other = JSON.stringify({ stripe_event: { type: 'ping', data: { object: {} } } });
    const res = await post(benignEnvelope, makeEnv(), await hmacSha256Hex(SECRET, other));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: 'invalid_federation_signature' });
  });

  it('400s when the envelope is addressed to another satellite', async () => {
    const body = JSON.stringify({
      satellite_app: 'custodia',
      stripe_event: { id: 'evt', type: 'ping', created: 1, data: { object: {} } },
    });
    const res = await post(body, makeEnv(), await hmacSha256Hex(SECRET, body));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: 'wrong_satellite' });
  });

  it('400s when stripe_event is missing or malformed', async () => {
    for (const body of [
      JSON.stringify({ hub_event_id: 'x' }),
      JSON.stringify({ stripe_event: 'not-an-object' }),
      JSON.stringify({ stripe_event: { type: 'ping' } }), // no data.object
      'not json at all',
    ]) {
      const res = await post(body, makeEnv(), await hmacSha256Hex(SECRET, body));
      expect(res.status).toBe(400);
      const json = (await res.json()) as { ok: boolean };
      expect(json.ok).toBe(false);
    }
  });

  it('accepts a correctly signed envelope and echoes hub_event_id', async () => {
    const res = await post(benignEnvelope, makeEnv(), await hmacSha256Hex(SECRET, benignEnvelope));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, received: true, hub_event_id: 'hub_evt_1' });
  });

  it('502s when the shared Stripe handler throws', async () => {
    const body = JSON.stringify({
      hub_event_id: 'hub_evt_2',
      satellite_app: 'bushi',
      stripe_event: {
        id: 'evt_2',
        type: 'checkout.session.completed',
        created: 1,
        data: { object: { client_reference_id: 'org_1', metadata: { tier: 'starter' } } },
      },
    });
    const res = await post(body, makeEnv(), await hmacSha256Hex(SECRET, body));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: 'handler_failed' });
  });
});
