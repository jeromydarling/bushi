# @bushi/notifications

Email / notification service.

- `EmailMessage` / `EmailProvider` interfaces.
- `CloudflareSendEmailProvider` — Cloudflare's native Email Sending via the Worker `send_email` binding (no third-party key). Builds a MIME message and hands it to an injected adapter that calls `env.SEND_EMAIL.send(new EmailMessage(...))`.
- `CloudflareEmailProvider` — generic HTTP/MailChannels-style JSON POST, kept for external providers.
- `ConsoleEmailProvider` for dev.
- Templates returning `{ subject, html, text }`: `welcomeEmail`, `inviteEmail`, `registrationConfirmationEmail`, `tournamentReminderEmail`, `postEventRecapEmail` (on-brand HTML).
- `NotificationService` with `sendEmail` + channel routing (`email` / `webhook` / `inapp`).

**Binding expected:** `send_email` (`SEND_EMAIL`). Declare `[[send_email]]` in `wrangler.toml` and verify the sender domain in Cloudflare **Email Routing**.
