/** Session lifetime helpers. */

/** Default session time-to-live: 30 days. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Compute the expiry timestamp for a session created at `now`. */
export function sessionExpiry(
  now: Date = new Date(),
  ttlMs: number = SESSION_TTL_MS,
): Date {
  return new Date(now.getTime() + ttlMs);
}

/** Whether a session with the given expiry is still valid at `now`. */
export function isSessionActive(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() > now.getTime();
}
