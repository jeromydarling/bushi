/**
 * Stripe webhook signature verification and parsing, implemented with WebCrypto
 * so it runs in Workers. Stripe signs with the `Stripe-Signature` header in the
 * form `t=<timestamp>,v1=<sig>,v1=<sig>...` where each signature is
 * HMAC-SHA256(`<timestamp>.<payload>`, webhookSecret).
 */

export interface StripeWebhookEvent {
  id: string;
  type: string;
  created: number;
  data: { object: Record<string, unknown> };
}

/** Default tolerance (seconds) for replay protection. */
export const DEFAULT_WEBHOOK_TOLERANCE_S = 300;

interface ParsedSignatureHeader {
  timestamp: number | null;
  signatures: string[];
}

function parseSignatureHeader(header: string): ParsedSignatureHeader {
  let timestamp: number | null = null;
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const [key, value] = part.split('=');
    if (key === 't' && value) timestamp = Number.parseInt(value, 10);
    if (key === 'v1' && value) signatures.push(value);
  }
  return { timestamp, signatures };
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  const bytes = new Uint8Array(sig);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verify a Stripe webhook signature. `payload` must be the raw request body
 * string (do not re-serialize the parsed JSON).
 */
export async function verifyWebhookSignature(
  payload: string,
  sigHeader: string,
  secret: string,
  toleranceSeconds: number = DEFAULT_WEBHOOK_TOLERANCE_S,
  now: number = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  const { timestamp, signatures } = parseSignatureHeader(sigHeader);
  if (timestamp === null || signatures.length === 0) return false;
  if (Math.abs(now - timestamp) > toleranceSeconds) return false;

  const expected = await hmacSha256Hex(secret, `${timestamp}.${payload}`);
  return signatures.some((sig) => timingSafeEqualHex(sig, expected));
}

/** Parse a raw webhook body into a typed event (does not verify signature). */
export function parseWebhookEvent(payload: string): StripeWebhookEvent {
  const parsed = JSON.parse(payload) as StripeWebhookEvent;
  return parsed;
}
