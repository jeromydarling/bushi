import { api } from './api.js';

/**
 * Kick off checkout for a tier. Talks to the Worker's billing endpoint, which
 * returns a live Stripe Checkout URL when keys are configured, or a stub URL
 * otherwise. Falls back to the pricing anchor so the CTA always does something.
 */
export async function startCheckout(tier: string): Promise<void> {
  try {
    const res = await fetch(`${(import.meta.env.VITE_API_BASE as string) ?? ''}/api/billing/checkout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tier }),
    });
    const body = (await res.json()) as { checkoutUrl?: string };
    if (body.checkoutUrl) {
      window.location.href = body.checkoutUrl;
      return;
    }
  } catch {
    /* fall through to demo behavior */
  }
  window.alert(
    `Checkout for the ${tier} plan would start here. Configure STRIPE_SECRET_KEY on the Worker to enable live Stripe Checkout.`,
  );
}

export { api };
