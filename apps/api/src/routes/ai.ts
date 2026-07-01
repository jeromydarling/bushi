import { Hono } from 'hono';
import { Db, now, type TournamentRow } from '@bushi/db';
import { STYLE_LABELS, type MartialArtStyle } from '@bushi/domain';
import type { AppBindings } from '../types.js';
import { HttpError } from '../lib/http.js';
import { uuid } from '../lib/crypto.js';
import { requireAuth } from '../middleware/auth.js';

/**
 * AI content endpoints backed by Workers AI. Every call is logged to
 * ai_generations for observability. When the AI binding is absent (local dev),
 * we return a deterministic templated fallback so the UI stays functional.
 */
export const aiRoutes = new Hono<AppBindings>();

const TEXT_MODEL = '@cf/meta/llama-3.1-8b-instruct';

aiRoutes.post('/tournament/:id/promo', requireAuth, async (c) => {
  const auth = c.get('auth')!;
  const db = new Db(c.env.DB);
  const t = await db.first<TournamentRow>(`SELECT * FROM tournaments WHERE id = ?`, c.req.param('id'));
  if (!t) throw new HttpError(404, 'Tournament not found');

  const styles = (JSON.parse(t.styles) as MartialArtStyle[]).map((s) => STYLE_LABELS[s] ?? s).join(', ');
  const system =
    'You are a sharp martial-arts marketing copywriter. Tone: disciplined, premium, athletic. Avoid clichés and emoji.';
  const prompt = `Write a punchy 90-word promotional announcement for the tournament "${t.name}" on ${t.start_date}${t.city ? ` in ${t.city}` : ''}. Styles featured: ${styles}. End with a call to register.`;

  const started = Date.now();
  let text: string;
  let status: 'ok' | 'fallback' = 'ok';
  if (c.env.AI) {
    try {
      const result = (await c.env.AI.run(TEXT_MODEL, {
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
      })) as { response?: string };
      text = result.response?.trim() || fallbackPromo(t.name, styles);
    } catch {
      text = fallbackPromo(t.name, styles);
      status = 'fallback';
    }
  } else {
    text = fallbackPromo(t.name, styles);
    status = 'fallback';
  }

  await db.run(
    `INSERT INTO ai_generations (id,org_id,user_id,feature,model,prompt_key,latency_ms,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    uuid(),
    auth.orgId,
    auth.userId,
    'promo_copy',
    TEXT_MODEL,
    'tournament.promo_copy',
    Date.now() - started,
    status,
    now(),
  );
  return c.json({ text, model: TEXT_MODEL, status });
});

// Organizer assistant — a lightweight command endpoint.
aiRoutes.post('/assistant', requireAuth, async (c) => {
  const { message } = await c.req.json<{ message?: string }>();
  if (!message) throw new HttpError(400, 'message is required');
  const system =
    'You are Bushi\'s organizer assistant. You help run martial arts tournaments: divisions, brackets, registrations, schedules, and reminders. Be concise and action-oriented.';
  if (!c.env.AI) {
    return c.json({
      text: `Here's how I'd approach "${message}": break it into divisions by style, age, and weight, then seed brackets and open registration. (Connect Workers AI for full responses.)`,
      status: 'fallback',
    });
  }
  const result = (await c.env.AI.run(TEXT_MODEL, {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: message },
    ],
  })) as { response?: string };
  return c.json({ text: result.response ?? '', status: 'ok' });
});

function fallbackPromo(name: string, styles: string): string {
  return `${name} is coming. One arena. Every style — ${styles}. Elite brackets, live scoring, and a spectator experience built for the moment. Competitors: sharpen your game. Schools: bring your squad. Registration is open now — claim your division before the brackets close.`;
}
