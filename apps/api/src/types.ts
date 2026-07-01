import type { Hono } from 'hono';
import type { AuthContext, Env } from './env.js';

export type AppBindings = {
  Bindings: Env;
  Variables: { auth: AuthContext | null };
};

export type App = Hono<AppBindings>;
