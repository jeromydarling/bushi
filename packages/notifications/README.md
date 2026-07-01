# @bushi/notifications

Email / notification service.

- `EmailMessage` / `EmailProvider` interfaces.
- `CloudflareEmailProvider` (MailChannels-style JSON POST via an injected fetch binding) and `ConsoleEmailProvider` for dev.
- Templates returning `{ subject, html, text }`: `welcomeEmail`, `inviteEmail`, `registrationConfirmationEmail`, `tournamentReminderEmail`, `postEventRecapEmail` (on-brand HTML).
- `NotificationService` with `sendEmail` + channel routing (`email` / `webhook` / `inapp`).

**Binding expected:** a fetch-capable send binding (e.g. `SEND_EMAIL` service binding or a Worker route to MailChannels). Endpoint defaults to MailChannels' `tx/v1/send`.
