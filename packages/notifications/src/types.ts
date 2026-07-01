export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailProvider {
  send(msg: EmailMessage): Promise<{ id: string }>;
}

/** A rendered template, ready to hand to an EmailProvider. */
export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export type NotificationChannel = 'email' | 'webhook' | 'inapp';

export interface NotificationEnvelope {
  channel: NotificationChannel;
  /** For email: recipient address. For webhook: URL. For inapp: user id. */
  target: string;
  subject?: string;
  html?: string;
  text?: string;
  /** Arbitrary structured payload for webhook/inapp channels. */
  payload?: Record<string, unknown>;
}
