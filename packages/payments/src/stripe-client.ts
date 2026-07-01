/**
 * Hand-rolled Stripe REST client. We deliberately avoid the `stripe` npm SDK
 * (it is heavy and not Workers-friendly) and instead issue typed `fetch` calls
 * to the Stripe API with form-encoded bodies.
 *
 * Live keys/config: `secretKey` is the `sk_live_...` / `sk_test_...` key stored
 * as a Worker secret; `webhookSecret` (`whsec_...`) is used by ./webhooks.ts.
 */

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
}

export interface CheckoutSessionParams {
  priceId: string;
  customerId?: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  mode?: 'subscription' | 'payment';
  clientReferenceId?: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSession {
  id: string;
  url: string | null;
  status: string | null;
  customer: string | null;
}

export interface BillingPortalParams {
  customerId: string;
  returnUrl: string;
}

export interface BillingPortalSession {
  id: string;
  url: string;
}

export interface StripeSubscription {
  id: string;
  status: string;
  customer: string;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  priceId: string | null;
}

/** Flatten nested params into Stripe's bracketed form-encoding. */
function encodeForm(
  data: Record<string, unknown>,
  prefix = '',
  params: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    const field = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item !== null && typeof item === 'object') {
          encodeForm(item as Record<string, unknown>, `${field}[${i}]`, params);
        } else {
          params.append(`${field}[${i}]`, String(item));
        }
      });
    } else if (typeof value === 'object') {
      encodeForm(value as Record<string, unknown>, field, params);
    } else {
      params.append(field, String(value));
    }
  }
  return params;
}

export class StripeClient {
  constructor(private readonly config: StripeConfig) {}

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.config.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };
    if (body && method === 'POST') {
      init.body = encodeForm(body).toString();
    }
    const res = await fetch(`${STRIPE_API_BASE}${path}`, init);
    const json = (await res.json()) as any;
    if (!res.ok) {
      const message = json?.error?.message ?? `Stripe request failed (${res.status})`;
      throw new Error(message);
    }
    return json as T;
  }

  /** Create a Checkout Session (subscription by default). */
  async createCheckoutSession(
    params: CheckoutSessionParams,
  ): Promise<CheckoutSession> {
    const body: Record<string, unknown> = {
      mode: params.mode ?? 'subscription',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      line_items: [{ price: params.priceId, quantity: 1 }],
    };
    if (params.customerId) body['customer'] = params.customerId;
    if (params.customerEmail) body['customer_email'] = params.customerEmail;
    if (params.clientReferenceId) {
      body['client_reference_id'] = params.clientReferenceId;
    }
    if (params.metadata) body['metadata'] = params.metadata;

    const raw = await this.request<any>('POST', '/checkout/sessions', body);
    return {
      id: raw.id,
      url: raw.url ?? null,
      status: raw.status ?? null,
      customer: raw.customer ?? null,
    };
  }

  /** Create a Billing Portal session so a customer can self-manage. */
  async createBillingPortalSession(
    params: BillingPortalParams,
  ): Promise<BillingPortalSession> {
    const raw = await this.request<any>('POST', '/billing_portal/sessions', {
      customer: params.customerId,
      return_url: params.returnUrl,
    });
    return { id: raw.id, url: raw.url };
  }

  /** Retrieve a subscription and normalize the fields we care about. */
  async retrieveSubscription(id: string): Promise<StripeSubscription> {
    const raw = await this.request<any>('GET', `/subscriptions/${id}`);
    const firstItem = raw?.items?.data?.[0];
    return {
      id: raw.id,
      status: raw.status,
      customer: raw.customer,
      currentPeriodEnd: raw.current_period_end ?? null,
      cancelAtPeriodEnd: Boolean(raw.cancel_at_period_end),
      priceId: firstItem?.price?.id ?? null,
    };
  }
}
