/**
 * Opaque token generation and hashing for sessions and invites.
 *
 * We hand out a random base64url token to the client and only ever persist
 * the SHA-256 hex digest of it, so a database leak does not expose live
 * session/invite tokens.
 */

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Generate a URL-safe random token (base64url of `bytes` random bytes). */
export function generateToken(bytes: number = 32): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return toBase64Url(buf);
}

/** SHA-256 hex digest of a token, suitable for storage/lookup. */
export async function hashToken(token: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(token));
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}
