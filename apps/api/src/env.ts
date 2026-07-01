/// <reference types="@cloudflare/workers-types" />

/**
 * The full set of Cloudflare bindings the Worker expects. Mirrors wrangler.toml.
 * Optional bindings are typed as possibly-undefined so route handlers degrade
 * gracefully when a resource isn't provisioned in a given environment.
 */
export interface Env {
  // D1
  DB: D1Database;

  // Durable Objects
  MAT_ROOM: DurableObjectNamespace;

  // KV
  CACHE: KVNamespace;
  FEATURE_FLAGS: KVNamespace;

  // R2
  ASSETS: R2Bucket;
  GENERATED: R2Bucket;

  // Queues
  JOBS: Queue<JobMessage>;

  // Workers AI (optional in local dev without an account)
  AI?: Ai;

  // Vectorize
  SEARCH_INDEX?: VectorizeIndex;

  // Browser Rendering
  BROWSER?: Fetcher;

  // Cloudflare Email Sending (`send_email` binding). Optional in local dev.
  SEND_EMAIL?: SendEmailBinding;

  // Vars
  ENVIRONMENT: string;
  AI_GATEWAY_ID: string;
  AI_GATEWAY_ACCOUNT_ID?: string;
  APP_BASE_URL: string;
  // Discovery tuning (all optional; sensible defaults in code).
  DISCOVERY_REGIONS?: string;
  DISCOVERY_STYLES?: string;
  DISCOVERY_HORIZON_MONTHS?: string;

  // Secrets
  SESSION_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  PERPLEXITY_API_KEY?: string;
}

/**
 * The Cloudflare `send_email` binding (Email Workers). The Worker builds a
 * `cloudflare:email` EmailMessage and passes it here. Typed loosely so env.ts
 * needn't import the `cloudflare:email` module.
 */
export interface SendEmailBinding {
  send(message: unknown): Promise<void>;
}

/** Messages placed on the JOBS queue for async fan-out. */
export type JobMessage =
  | { kind: 'send_email'; to: string; template: string; data: Record<string, unknown> }
  | { kind: 'generate_asset'; assetKind: string; tournamentId: string; prompt?: string }
  | { kind: 'index_entity'; entityType: string; entityId: string }
  | { kind: 'persist_match_result'; matchId: string; winnerAthleteId: string; method: string };

/** Hono context variables set by middleware. */
export interface AuthContext {
  userId: string;
  email: string;
  roles: string[];
  orgId: string | null;
}
