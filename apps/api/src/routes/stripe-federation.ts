import { Hono } from 'hono';
import { hmacSha256Hex, timingSafeEqualHex, type StripeWebhookEvent } from '@bushi/payments';
import type { AppBindings } from '../types.js';
import { handleStripeEvent } from './billing.js';

/**
 * CROS hub → Bushi Stripe federation receiver.
 *
 * The CROS hub receives all Stripe events centrally and forwards each app's
 * events as a JSON envelope signed with a shared secret:
 *
 *   POST /api/stripe/federation-in
 *   X-CROS-Federation-Signature: <lowercase hex HMAC-SHA256 of the raw body,
 *                                 keyed by FEDERATION_STRIPE_SECRET>
 *   { hub_event_id, satellite_app, stripe_event, delivered_at }
 *
 * The signature covers the exact raw bytes, so the body is read as text FIRST
 * and only parsed after verification. Verified events are handed to the same
 * `handleStripeEvent` the direct Stripe webhook uses, so the two paths cannot
 * drift. Fails closed when FEDERATION_STRIPE_SECRET is unset.
 */
export const stripeFederationRoutes = new Hono<AppBindings>();

/** The satellite slug this app answers to in the CROS federation. */
const SATELLITE_APP = 'bushi';

interface FederationEnvelope {
  hub_event_id?: unknown;
  satellite_app?: unknown;
  stripe_event?: unknown;
  delivered_at?: unknown;
}

/** Minimal shape check so a malformed event 400s instead of exploding in the handler. */
function isStripeEvent(value: unknown): value is StripeWebhookEvent {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as Record<string, unknown>;
  if (typeof e.type !== 'string') return false;
  const data = e.data as Record<string, unknown> | undefined;
  return typeof data === 'object' && data !== null && typeof data.object === 'object' && data.object !== null;
}

stripeFederationRoutes.post('/federation-in', async (c) => {
  const secret = c.env.FEDERATION_STRIPE_SECRET;
  if (!secret) {
    // Fail closed: without the shared secret nothing can be verified.
    return c.json({ ok: false, error: 'federation_not_configured' }, 500);
  }

  // Read the RAW body first — the signature covers these exact bytes.
  const payload = await c.req.text();
  const sig = c.req.header('X-CROS-Federation-Signature');
  if (!sig) {
    return c.json({ ok: false, error: 'missing_federation_signature' }, 400);
  }
  const expected = await hmacSha256Hex(secret, payload);
  if (!timingSafeEqualHex(sig.toLowerCase(), expected)) {
    return c.json({ ok: false, error: 'invalid_federation_signature' }, 400);
  }

  // Only now is the body trusted enough to parse.
  let envelope: FederationEnvelope;
  try {
    envelope = JSON.parse(payload) as FederationEnvelope;
  } catch {
    return c.json({ ok: false, error: 'invalid_envelope' }, 400);
  }
  if (typeof envelope !== 'object' || envelope === null) {
    return c.json({ ok: false, error: 'invalid_envelope' }, 400);
  }
  if (envelope.satellite_app !== undefined && envelope.satellite_app !== SATELLITE_APP) {
    return c.json({ ok: false, error: 'wrong_satellite' }, 400);
  }
  if (!isStripeEvent(envelope.stripe_event)) {
    return c.json({ ok: false, error: 'invalid_stripe_event' }, 400);
  }

  try {
    await handleStripeEvent(envelope.stripe_event, c.env);
  } catch (err) {
    console.error('Federation Stripe event handler failed:', err);
    return c.json({ ok: false, error: 'handler_failed' }, 502);
  }

  return c.json({ ok: true, received: true, hub_event_id: envelope.hub_event_id ?? null });
});
