/**
 * Password hashing for Cloudflare Workers using WebCrypto PBKDF2.
 *
 * Storage format: `pbkdf2$<iterations>$<saltB64>$<hashB64>`.
 * We use SHA-256 with ~100k iterations and a 16-byte random salt.
 * WebCrypto (`crypto.subtle`) is available in the Workers runtime, so this
 * has no Node dependency.
 */

const ALGO = 'pbkdf2';
const DEFAULT_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function deriveBits(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    HASH_BITS,
  );
  return new Uint8Array(bits);
}

/** Hash a plaintext password into a storable, self-describing string. */
export async function hashPassword(
  password: string,
  iterations: number = DEFAULT_ITERATIONS,
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await deriveBits(password, salt, iterations);
  return `${ALGO}$${iterations}$${toBase64(salt)}$${toBase64(hash)}`;
}

/** Constant-time-ish comparison of two byte arrays. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    // Both indexes are in-bounds due to the length check above.
    diff |= (a[i] as number) ^ (b[i] as number);
  }
  return diff === 0;
}

/** Verify a plaintext password against a stored `pbkdf2$...` string. */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4) return false;
  const [algo, iterStr, saltB64, hashB64] = parts as [
    string,
    string,
    string,
    string,
  ];
  if (algo !== ALGO) return false;
  const iterations = Number.parseInt(iterStr, 10);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  let salt: Uint8Array;
  let expected: Uint8Array;
  try {
    salt = fromBase64(saltB64);
    expected = fromBase64(hashB64);
  } catch {
    return false;
  }
  const actual = await deriveBits(password, salt, iterations);
  return timingSafeEqual(actual, expected);
}
