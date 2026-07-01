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

/**
 * Generic HTTP email provider posting a MailChannels-style payload. Kept as an
 * option for external providers; the native, key-less path is
 * `CloudflareSendEmailProvider` (the Worker `send_email` binding).
 */
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

/**
 * Cloudflare Email Sending via the Worker `send_email` binding — the native
 * path (no third-party key). The Worker constructs a `cloudflare:email`
 * `EmailMessage` and hands it to this adapter, so this package stays free of
 * the `cloudflare:email` import and compiles standalone.
 *
 * Wire in the Worker:
 *   import { EmailMessage } from 'cloudflare:email';
 *   const provider = new CloudflareSendEmailProvider({
 *     from: 'Bushi <no-reply@bushi.app>',
 *     adapter: { send: (m) => env.SEND_EMAIL.send(new EmailMessage(m.from, m.to, m.raw)) },
 *   });
 *
 * The sender domain must be verified in Cloudflare Email Routing, and
 * destination addresses verified (or covered by a catch-all) per Cloudflare's
 * Email Workers rules.
 */
export interface SendEmailAdapter {
  send(message: { from: string; to: string; raw: string }): Promise<void>;
}

export interface CloudflareSendEmailProviderConfig {
  adapter: SendEmailAdapter;
  /** Envelope + header From, e.g. "Bushi <no-reply@bushi.app>". */
  from?: string;
}

export class CloudflareSendEmailProvider implements EmailProvider {
  private readonly from: string;

  constructor(private readonly config: CloudflareSendEmailProviderConfig) {
    this.from = config.from ?? DEFAULT_FROM;
  }

  async send(msg: EmailMessage): Promise<{ id: string }> {
    const fromHeader = msg.from ?? this.from;
    const { email: fromEmail } = parseAddress(fromHeader);
    const id = crypto.randomUUID();
    const raw = buildMime({
      from: fromHeader,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text ?? stripHtml(msg.html),
      replyTo: msg.replyTo,
      messageId: `${id}@bushi.app`,
    });
    await this.config.adapter.send({ from: fromEmail, to: msg.to, raw });
    return { id };
  }
}

/** Build a minimal multipart/alternative RFC 822 message. */
function buildMime(m: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  messageId: string;
}): string {
  const boundary = `bushi-${m.messageId.replace(/[^a-z0-9]/gi, '').slice(0, 24)}`;
  const headers = [
    `From: ${m.from}`,
    `To: ${m.to}`,
    `Subject: ${m.subject}`,
    `Message-ID: <${m.messageId}>`,
    ...(m.replyTo ? [`Reply-To: ${m.replyTo}`] : []),
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  return [
    headers.join('\r\n'),
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    m.text,
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    m.html,
    `--${boundary}--`,
    '',
  ].join('\r\n');
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
