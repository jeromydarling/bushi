import { Hono, type Context } from 'hono';
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from '@bushi/domain';
import { Db, now, type SubscriptionRow } from '@bushi/db';
import { StripeClient, PRICES, verifyWebhookSignature, parseWebhookEvent } from '@bushi/payments';
import { billingNoticeEmail } from '@bushi/notifications';
import type { AppBindings } from '../types.js';
import { HttpError } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';

/**
 * Billing. When STRIPE_SECRET_KEY is configured these handlers hand off to real
 * Stripe Checkout / Billing Portal via @bushi/payments; otherwise they return a
 * deterministic stub so the pricing flow is demoable without keys. The webhook
 * verifies the Stripe-Signature HMAC against the raw body before trusting events.
 */
export const billingRoutes = new Hono<AppBindings>();

billingRoutes.get('/plans', (c) => {
  return c.json({
    tiers: SUBSCRIPTION_TIERS.map((tier) => ({
      tier,
      monthlyCents: PRICES[tier].monthly,
      annualCents: PRICES[tier].annual,
    })),
  });
});

/** Configured Stripe Price ID for a paid tier (env-provided); null if none. */
function priceIdForTier(c: Context<AppBindings>, tier: SubscriptionTier): string | null {
  switch (tier) {
    case 'starter':
      return c.env.STRIPE_PRICE_STARTER ?? null;
    case 'pro':
      return c.env.STRIPE_PRICE_PRO ?? null;
    default:
      return null; // free = no checkout; enterprise = sales-assisted
  }
}

function stripe(c: Context<AppBindings>): StripeClient {
  return new StripeClient({
    secretKey: c.env.STRIPE_SECRET_KEY!,
    webhookSecret: c.env.STRIPE_WEBHOOK_SECRET ?? '',
  });
}

billingRoutes.post('/checkout', requireAuth, async (c) => {
  const auth = c.get('auth')!;
  const { tier } = await c.req.json<{ tier?: string }>();
  if (!tier || !SUBSCRIPTION_TIERS.includes(tier as SubscriptionTier)) {
    throw new HttpError(400, 'Unknown plan tier');
  }
  const t = tier as SubscriptionTier;
  if (t === 'free') throw new HttpError(400, 'The free plan needs no checkout');
  if (t === 'enterprise') throw new HttpError(400, 'Enterprise is sales-assisted — please contact us');

  if (!c.env.STRIPE_SECRET_KEY) {
    // Stub mode — pretend the checkout succeeded and return a fake URL.
    return c.json({
      mode: 'stub',
      checkoutUrl: `${c.env.APP_BASE_URL}/app?checkout=stub&tier=${tier}`,
      message: 'Stripe not configured — set STRIPE_SECRET_KEY to enable live checkout.',
    });
  }

  const priceId = priceIdForTier(c, t);
  if (!priceId) throw new HttpError(400, `No Stripe price configured for the ${tier} plan`);

  const db = new Db(c.env.DB);
  const sub = await db.first<SubscriptionRow>(`SELECT * FROM subscriptions WHERE org_id = ?`, auth.orgId);

  try {
    const session = await stripe(c).createCheckoutSession({
      priceId,
      customerId: sub?.stripe_customer_id ?? undefined,
      customerEmail: sub?.stripe_customer_id ? undefined : auth.email,
      successUrl: `${c.env.APP_BASE_URL}/app?checkout=success`,
      cancelUrl: `${c.env.APP_BASE_URL}/pricing?checkout=cancelled`,
      clientReferenceId: auth.orgId ?? undefined,
      metadata: { orgId: auth.orgId ?? '', tier },
    });
    return c.json({ mode: 'live', checkoutUrl: session.url, id: session.id });
  } catch (err) {
    throw new HttpError(502, err instanceof Error ? err.message : 'Stripe checkout failed');
  }
});

// Billing portal so a customer can self-manage payment method / cancel.
billingRoutes.post('/portal', requireAuth, async (c) => {
  const auth = c.get('auth')!;
  if (!c.env.STRIPE_SECRET_KEY) throw new HttpError(400, 'Billing is not configured');
  const db = new Db(c.env.DB);
  const sub = await db.first<SubscriptionRow>(`SELECT * FROM subscriptions WHERE org_id = ?`, auth.orgId);
  if (!sub?.stripe_customer_id) throw new HttpError(400, 'No billing account yet — subscribe first');
  try {
    const portal = await stripe(c).createBillingPortalSession({
      customerId: sub.stripe_customer_id,
      returnUrl: `${c.env.APP_BASE_URL}/app`,
    });
    return c.json({ url: portal.url });
  } catch (err) {
    throw new HttpError(502, err instanceof Error ? err.message : 'Stripe portal failed');
  }
});

billingRoutes.get('/subscription', requireAuth, async (c) => {
  const auth = c.get('auth')!;
  const db = new Db(c.env.DB);
  const sub = await db.first<SubscriptionRow>(`SELECT * FROM subscriptions WHERE org_id = ?`, auth.orgId);
  return c.json({ subscription: sub });
});

// Stripe webhook — verify the signature against the RAW body, then reconcile.
billingRoutes.post('/webhook', async (c) => {
  if (!c.env.STRIPE_WEBHOOK_SECRET) {
    return c.json({ received: true, mode: 'stub' });
  }
  const payload = await c.req.text();
  const sig = c.req.header('Stripe-Signature') ?? '';
  const valid = await verifyWebhookSignature(payload, sig, c.env.STRIPE_WEBHOOK_SECRET);
  if (!valid) throw new HttpError(400, 'Invalid webhook signature');

  const event = parseWebhookEvent(payload);
  const obj = event.data.object;
  const db = new Db(c.env.DB);

  switch (event.type) {
    case 'checkout.session.completed': {
      const metadata = (obj.metadata as Record<string, string> | undefined) ?? {};
      const orgId = String(obj.client_reference_id ?? metadata.orgId ?? '');
      const tier = String(metadata.tier ?? 'starter');
      const customerId = obj.customer ? String(obj.customer) : null;
      const subscriptionId = obj.subscription ? String(obj.subscription) : null;
      if (orgId) {
        await db.run(
          `UPDATE subscriptions SET tier = ?, status = 'active', stripe_customer_id = ?, stripe_subscription_id = ?, updated_at = ? WHERE org_id = ?`,
          tier,
          customerId,
          subscriptionId,
          now(),
          orgId,
        );
        await db.run(`UPDATE organizations SET plan_tier = ?, updated_at = ? WHERE id = ?`, tier, now(), orgId);
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const stripeSubId = String(obj.id ?? '');
      const status = event.type === 'customer.subscription.deleted' ? 'canceled' : String(obj.status ?? 'active');
      const cancelAtPeriodEnd = obj.cancel_at_period_end ? 1 : 0;
      const currentPeriodEnd = obj.current_period_end ? Number(obj.current_period_end) * 1000 : null;
      await db.run(
        `UPDATE subscriptions SET status = ?, cancel_at_period_end = ?, current_period_end = ?, updated_at = ? WHERE stripe_subscription_id = ?`,
        status,
        cancelAtPeriodEnd,
        currentPeriodEnd,
        now(),
        stripeSubId,
      );
      // Dunning: notify the org's owner/organizer on payment failure or cancellation.
      if (status === 'past_due' || status === 'canceled') {
        const sub = await db.first<{ org_id: string }>(
          `SELECT org_id FROM subscriptions WHERE stripe_subscription_id = ?`,
          stripeSubId,
        );
        if (sub) {
          const owner = await db.first<{ email: string }>(
            `SELECT u.email FROM organization_memberships m JOIN users u ON u.id = m.user_id
             WHERE m.org_id = ? AND m.role IN ('owner','organizer') ORDER BY m.created_at LIMIT 1`,
            sub.org_id,
          );
          if (owner?.email) {
            const mail = billingNoticeEmail({
              status: status === 'canceled' ? 'canceled' : 'past_due',
              manageUrl: `${c.env.APP_BASE_URL}/app`,
            });
            try {
              await c.env.JOBS?.send({ kind: 'send_email', to: owner.email, subject: mail.subject, html: mail.html, text: mail.text });
            } catch {
              /* queue not bound in dev */
            }
          }
        }
      }
      break;
    }
  }
  return c.json({ received: true });
});
