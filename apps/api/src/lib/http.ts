import type { Context } from 'hono';
import type { z, ZodTypeAny } from 'zod';

/** Parse+validate a JSON body against a Zod schema, throwing a 400 on failure. */
export async function parseBody<S extends ZodTypeAny>(c: Context, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new HttpError(400, 'Invalid JSON body');
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new HttpError(400, 'Validation failed', result.error.flatten());
  }
  return result.data;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** Session cookie name, shared by auth routes + middleware. */
export const SESSION_COOKIE = 'bushi_session';
