# @bushi/auth

Shared auth primitives for Cloudflare Workers (Hono).

- **Password hashing** — WebCrypto PBKDF2 (SHA-256, 100k iterations). `hashPassword` / `verifyPassword`. Storage format `pbkdf2$iterations$saltB64$hashB64`.
- **Tokens** — `generateToken(bytes=32)` (base64url random) and `hashToken` (SHA-256 hex) for session/invite storage (store the hash, hand out the token).
- **Sessions** — `SESSION_TTL_MS`, `sessionExpiry(now)`, `isSessionActive`.
- **Permissions** — `RolePermissions` map keyed by domain `Role`, `can(role, action)`, and the `ACTIONS` list.

Uses WebCrypto (`crypto.subtle`, `crypto.getRandomValues`) — available in the Workers runtime. No Cloudflare binding required.
