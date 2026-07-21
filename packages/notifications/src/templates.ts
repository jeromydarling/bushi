import type { RenderedEmail } from './types.js';

const BRAND = '#b91c1c'; // Bushi crimson
const INK = '#1a1a1a';
const MUTED = '#6b7280';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Shared shell around body content for consistent, clean HTML emails. */
function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${INK};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
<tr><td style="background:${BRAND};padding:20px 28px;">
<span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">武士 Bushi</span>
</td></tr>
<tr><td style="padding:28px;">
${bodyHtml}
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #eee;color:${MUTED};font-size:12px;">
Bushi — the operating system for martial arts tournaments.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function button(label: string, url: string): string {
  return `<a href="${escapeHtml(url)}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">${escapeHtml(label)}</a>`;
}

function para(text: string): string {
  return `<p style="font-size:15px;line-height:1.55;margin:0 0 16px;">${escapeHtml(text)}</p>`;
}

export interface WelcomeVars {
  name: string;
  ctaUrl: string;
}
export function welcomeEmail(v: WelcomeVars): RenderedEmail {
  const subject = 'Welcome to Bushi';
  const html = layout(
    subject,
    `<h1 style="font-size:22px;margin:0 0 16px;">Welcome, ${escapeHtml(v.name)}</h1>
${para('Your Bushi account is ready. Run tournaments, manage schools, and grow your community — all in one place.')}
${button('Open your dashboard', v.ctaUrl)}`,
  );
  const text = `Welcome, ${v.name}. Your Bushi account is ready. Open your dashboard: ${v.ctaUrl}`;
  return { subject, html, text };
}

export interface PasswordResetVars {
  name: string;
  resetUrl: string;
}
export function passwordResetEmail(v: PasswordResetVars): RenderedEmail {
  const subject = 'Reset your Bushi password';
  const html = layout(
    subject,
    `<h1 style="font-size:22px;margin:0 0 16px;">Reset your password</h1>
${para(`Hi ${v.name}, we received a request to reset your Bushi password.`)}
${para('Choose a new password with the button below. This link expires in 1 hour. If you didn’t request this, you can safely ignore this email.')}
${button('Reset password', v.resetUrl)}`,
  );
  const text = `Reset your Bushi password: ${v.resetUrl} (this link expires in 1 hour). If you didn't request it, ignore this email.`;
  return { subject, html, text };
}

export interface PasswordChangedVars {
  name: string;
  supportUrl: string;
}
export function passwordChangedEmail(v: PasswordChangedVars): RenderedEmail {
  const subject = 'Your Bushi password was changed';
  const html = layout(
    subject,
    `<h1 style="font-size:22px;margin:0 0 16px;">Password changed</h1>
${para(`Hi ${v.name}, your Bushi password was just changed and all other sessions were signed out.`)}
${para('If this was you, no action is needed. If it wasn’t, reset your password immediately and contact support.')}
${button('Contact support', v.supportUrl)}`,
  );
  const text = `Your Bushi password was changed. If this wasn't you, reset it immediately and contact support: ${v.supportUrl}`;
  return { subject, html, text };
}

export interface BillingNoticeVars {
  status: 'past_due' | 'canceled';
  manageUrl: string;
}
export function billingNoticeEmail(v: BillingNoticeVars): RenderedEmail {
  const isCanceled = v.status === 'canceled';
  const subject = isCanceled ? 'Your Bushi subscription was canceled' : 'Action needed: your Bushi payment failed';
  const heading = isCanceled ? 'Subscription canceled' : 'Payment failed';
  const body = isCanceled
    ? `${para('Your Bushi subscription has been canceled and your organization has moved to the free plan.')}${para('You can resubscribe anytime to restore premium features.')}${button('Resubscribe', v.manageUrl)}`
    : `${para('We couldn’t process your latest Bushi payment. To avoid losing premium features, please update your payment method.')}${button('Update payment method', v.manageUrl)}`;
  const html = layout(subject, `<h1 style="font-size:22px;margin:0 0 16px;">${heading}</h1>${body}`);
  const text = isCanceled
    ? `Your Bushi subscription was canceled. Resubscribe: ${v.manageUrl}`
    : `Your Bushi payment failed. Update your payment method: ${v.manageUrl}`;
  return { subject, html, text };
}

export interface InviteVars {
  inviterName: string;
  organizationName: string;
  role: string;
  acceptUrl: string;
}
export function inviteEmail(v: InviteVars): RenderedEmail {
  const subject = `${v.inviterName} invited you to ${v.organizationName} on Bushi`;
  const html = layout(
    subject,
    `<h1 style="font-size:22px;margin:0 0 16px;">You're invited</h1>
${para(`${v.inviterName} has invited you to join ${v.organizationName} as ${v.role}.`)}
${button('Accept invitation', v.acceptUrl)}`,
  );
  const text = `${v.inviterName} invited you to ${v.organizationName} as ${v.role}. Accept: ${v.acceptUrl}`;
  return { subject, html, text };
}

export interface WaitlistPromotedVars {
  athleteName: string;
  tournamentName: string;
  detailsUrl: string;
}
export function waitlistPromotedEmail(v: WaitlistPromotedVars): RenderedEmail {
  const subject = `A spot opened up: ${v.tournamentName}`;
  const html = layout(
    subject,
    `<h1 style="font-size:22px;margin:0 0 16px;">You’re off the waitlist 🎉</h1>
${para(`${v.athleteName} has moved off the waitlist for ${v.tournamentName}. Complete registration to secure the spot.`)}
${button('Complete registration', v.detailsUrl)}`,
  );
  const text = `${v.athleteName} is off the waitlist for ${v.tournamentName}. Complete registration: ${v.detailsUrl}`;
  return { subject, html, text };
}

export interface RegistrationConfirmationVars {
  athleteName: string;
  tournamentName: string;
  division: string;
  date: string;
  location: string;
  detailsUrl: string;
}
export function registrationConfirmationEmail(
  v: RegistrationConfirmationVars,
): RenderedEmail {
  const subject = `You're registered for ${v.tournamentName}`;
  const html = layout(
    subject,
    `<h1 style="font-size:22px;margin:0 0 16px;">Registration confirmed</h1>
${para(`${v.athleteName} is registered for ${v.tournamentName}.`)}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;font-size:14px;color:${INK};">
<tr><td style="padding:4px 12px 4px 0;color:${MUTED};">Division</td><td style="padding:4px 0;">${escapeHtml(v.division)}</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:${MUTED};">Date</td><td style="padding:4px 0;">${escapeHtml(v.date)}</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:${MUTED};">Location</td><td style="padding:4px 0;">${escapeHtml(v.location)}</td></tr>
</table>
${button('View details', v.detailsUrl)}`,
  );
  const text = `Registration confirmed for ${v.athleteName} at ${v.tournamentName} (${v.division}), ${v.date}, ${v.location}. Details: ${v.detailsUrl}`;
  return { subject, html, text };
}

export interface TournamentReminderVars {
  tournamentName: string;
  date: string;
  location: string;
  checkInTime: string;
  detailsUrl: string;
}
export function tournamentReminderEmail(
  v: TournamentReminderVars,
): RenderedEmail {
  const subject = `Reminder: ${v.tournamentName} is coming up`;
  const html = layout(
    subject,
    `<h1 style="font-size:22px;margin:0 0 16px;">See you on the mat</h1>
${para(`${v.tournamentName} is on ${v.date} at ${v.location}. Check-in opens at ${v.checkInTime}.`)}
${button('View schedule', v.detailsUrl)}`,
  );
  const text = `Reminder: ${v.tournamentName} on ${v.date} at ${v.location}. Check-in ${v.checkInTime}. ${v.detailsUrl}`;
  return { subject, html, text };
}

export interface PostEventRecapVars {
  tournamentName: string;
  recapBody: string;
  recapUrl: string;
}
export function postEventRecapEmail(v: PostEventRecapVars): RenderedEmail {
  const subject = `Recap: ${v.tournamentName}`;
  const html = layout(
    subject,
    `<h1 style="font-size:22px;margin:0 0 16px;">${escapeHtml(v.tournamentName)} — recap</h1>
${para(v.recapBody)}
${button('Read the full recap', v.recapUrl)}`,
  );
  const text = `${v.tournamentName} recap: ${v.recapBody} Read more: ${v.recapUrl}`;
  return { subject, html, text };
}
