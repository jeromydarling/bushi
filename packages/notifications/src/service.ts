import type {
  EmailMessage,
  EmailProvider,
  NotificationEnvelope,
} from './types.js';

/** Optional webhook dispatcher used by the 'webhook' channel. */
export interface WebhookDispatcher {
  dispatch(url: string, payload: Record<string, unknown>): Promise<void>;
}

/** Optional in-app store used by the 'inapp' channel. */
export interface InAppStore {
  create(userId: string, notification: Record<string, unknown>): Promise<void>;
}

export interface NotificationServiceDeps {
  email: EmailProvider;
  webhook?: WebhookDispatcher;
  inApp?: InAppStore;
}

/**
 * Central notification service. Email is always available; webhook and in-app
 * channels are optional and no-op (with a thrown error) if not wired.
 */
export class NotificationService {
  constructor(private readonly deps: NotificationServiceDeps) {}

  /** Send a raw email through the configured provider. */
  async sendEmail(msg: EmailMessage): Promise<{ id: string }> {
    return this.deps.email.send(msg);
  }

  /** Route a notification to the correct channel. */
  async send(envelope: NotificationEnvelope): Promise<void> {
    switch (envelope.channel) {
      case 'email':
        await this.sendEmail({
          to: envelope.target,
          subject: envelope.subject ?? '',
          html: envelope.html ?? '',
          text: envelope.text,
        });
        return;
      case 'webhook':
        if (!this.deps.webhook) throw new Error('Webhook channel not configured');
        await this.deps.webhook.dispatch(envelope.target, envelope.payload ?? {});
        return;
      case 'inapp':
        if (!this.deps.inApp) throw new Error('In-app channel not configured');
        await this.deps.inApp.create(envelope.target, envelope.payload ?? {});
        return;
      default: {
        const _exhaustive: never = envelope.channel;
        throw new Error(`Unknown channel: ${String(_exhaustive)}`);
      }
    }
  }
}
