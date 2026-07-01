import { Hono } from 'hono';
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from '@bushi/domain';
import { Db, now, type SubscriptionRow } from '@bushi/db';
import type { AppBindings } from '../types.js';
import { HttpError } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';

/**
 * Billing scaffolding. When STRIPE_SECRET_KEY is configured these handlers hand
 * off to Stripe Checkout / the billing portal; otherwise they return a
 * deterministic stub so the pricing flow is demoable end-to-end without keys.
 */
export const billingRoutes = new Hono<AppBindings>();

// Monthly prices in cents — mirrored by @bushi/payments PRICES for the real flow.
const PRICE_CENTS: Record<SubscriptionTier, number> = {
  free: 0,
  starter: 4900,
  pro: 14900,
  enterprise: 0, // "contact sales"
};

billingRoutes.get('/plans', (c) => {
  return c.json({
    tiers: SUBSCRIPTION_TIERS.map((tier) => ({
      tier,
      monthlyCents: PRICE_CENTS[tier],
      annualCents: PRICE_CENTS[tier] * 10, // ~2 months free
    })),
  });
});

billingRoutes.post('/checkout', requireAuth, async (c) => {
  const { tier } = await c.req.json<{ tier?: string }>();
  if (!tier || !SUBSCRIPTION_TIERS.includes(tier as SubscriptionTier)) {
    throw new HttpError(400, 'Unknown plan tier');
  }

  if (!c.env.STRIPE_SECRET_KEY) {
    // Stub mode — pretend the checkout succeeded and return a fake URL.
    return c.json({
      mode: 'stub',
      checkoutUrl: `${c.env.APP_BASE_URL}/app?checkout=stub&tier=${tier}`,
      message: 'Stripe not configured — set STRIPE_SECRET_KEY to enable live checkout.',
    });
  }

  // Live mode: create a Checkout Session via the Stripe REST API.
  const params = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': `price_${tier}`,
    'line_items[0][quantity]': '1',
    success_url: `${c.env.APP_BASE_URL}/app?checkout=success`,
    cancel_url: `${c.env.APP_BASE_URL}/pricing?checkout=cancelled`,
  });
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  if (!res.ok) throw new HttpError(502, 'Stripe checkout failed');
  const session = (await res.json()) as { url?: string; id?: string };
  return c.json({ mode: 'live', checkoutUrl: session.url, id: session.id });
});

billingRoutes.get('/subscription', requireAuth, async (c) => {
  const auth = c.get('auth')!;
  const db = new Db(c.env.DB);
  const sub = await db.first<SubscriptionRow>(`SELECT * FROM subscriptions WHERE org_id = ?`, auth.orgId);
  return c.json({ subscription: sub });
});

// Stripe webhook — signature verification lives in @bushi/payments for the full
// implementation; here we upsert subscription state from the event.
billingRoutes.post('/webhook', async (c) => {
  if (!c.env.STRIPE_WEBHOOK_SECRET) {
    return c.json({ received: true, mode: 'stub' });
  }
  const event = await c.req.json<{ type: string; data?: { object?: Record<string, unknown> } }>();
  const obj = event.data?.object ?? {};
  const db = new Db(c.env.DB);
  if (event.type.startsWith('customer.subscription')) {
    const stripeSubId = String(obj.id ?? '');
    const status = String(obj.status ?? 'active');
    await db.run(
      `UPDATE subscriptions SET status = ?, updated_at = ? WHERE stripe_subscription_id = ?`,
      status,
      now(),
      stripeSubId,
    );
  }
  return c.json({ received: true });
});
