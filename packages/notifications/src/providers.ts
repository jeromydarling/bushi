import type { EmailMessage, EmailProvider } from './types.js';

const DEFAULT_FROM = 'Bushi <no-reply@bushi.app>';

/**
 * MailChannels-style send binding. Cloudflare's Email Routing "send" and the
 * MailChannels API share this JSON shape; we POST to a configured endpoint.
 * In production this is fronted by the `SEND_EMAIL` binding or a Worker route.
 */
export interface MailSendBinding {
  fetch(input: string, init: RequestInit): Promise<Response>;
}

export interface CloudflareEmailProviderConfig {
  /** Fetch-capable binding (e.g. a service binding or `fetch` itself). */
  binding: MailSendBinding;
  /** Endpoint to POST to (MailChannels: https://api.mailchannels.net/tx/v1/send). */
  endpoint?: string;
  defaultFrom?: string;
}

/** Production email provider posting a MailChannels-style payload. */
export class CloudflareEmailProvider implements EmailProvider {
  private readonly endpoint: string;
  private readonly defaultFrom: string;

  constructor(private readonly config: CloudflareEmailProviderConfig) {
    this.endpoint =
      config.endpoint ?? 'https://api.mailchannels.net/tx/v1/send';
    this.defaultFrom = config.defaultFrom ?? DEFAULT_FROM;
  }

  async send(msg: EmailMessage): Promise<{ id: string }> {
    const from = parseAddress(msg.from ?? this.defaultFrom);
    const body = {
      personalizations: [{ to: [{ email: msg.to }] }],
      from,
      subject: msg.subject,
      content: [
        { type: 'text/plain', value: msg.text ?? stripHtml(msg.html) },
        { type: 'text/html', value: msg.html },
      ],
      ...(msg.replyTo ? { reply_to: { email: msg.replyTo } } : {}),
    };
    const res = await this.config.binding.fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Email send failed (${res.status}): ${detail}`);
    }
    const id = res.headers.get('x-message-id') ?? crypto.randomUUID();
    return { id };
  }
}

/** Dev provider that logs instead of sending. */
export class ConsoleEmailProvider implements EmailProvider {
  constructor(private readonly logger: Pick<Console, 'log'> = console) {}

  async send(msg: EmailMessage): Promise<{ id: string }> {
    const id = crypto.randomUUID();
    this.logger.log('[ConsoleEmailProvider] email', {
      id,
      to: msg.to,
      subject: msg.subject,
    });
    return { id };
  }
}

function parseAddress(input: string): { email: string; name?: string } {
  const match = input.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) {
    const name = match[1];
    const email = match[2] as string;
    return name ? { email, name } : { email };
  }
  return { email: input.trim() };
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
