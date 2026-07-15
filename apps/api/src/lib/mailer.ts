import {
  NotificationService,
  CloudflareSendEmailProvider,
  ConsoleEmailProvider,
} from '@bushi/notifications';
import { EmailMessage } from 'cloudflare:email';
import type { Env } from '../env.js';

/** Header/envelope From for outbound mail. Sender domain must be verified in Email Routing. */
const DEFAULT_FROM = 'Bushi <no-reply@bushi.app>';

/**
 * Build a NotificationService bound to Cloudflare's native `send_email` binding
 * when present, falling back to a console logger in local dev (no binding). This
 * is the single place the Worker touches `cloudflare:email`.
 */
export function getMailer(env: Env): NotificationService {
  if (env.SEND_EMAIL) {
    const provider = new CloudflareSendEmailProvider({
      from: DEFAULT_FROM,
      adapter: {
        send: async ({ from, to, raw }) => {
          await env.SEND_EMAIL!.send(new EmailMessage(from, to, raw));
        },
      },
    });
    return new NotificationService({ email: provider });
  }
  return new NotificationService({ email: new ConsoleEmailProvider() });
}
