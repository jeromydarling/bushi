/** Internal, normalized subscription state used across Bushi. */
export type SubscriptionState =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'unpaid';

/** Raw Stripe subscription statuses. */
export type StripeSubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'paused';

/** Map a Stripe subscription status onto our internal state. */
export function mapSubscriptionStatus(
  status: StripeSubscriptionStatus | string,
): SubscriptionState {
  switch (status) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
      return 'past_due';
    case 'unpaid':
      return 'unpaid';
    case 'canceled':
    case 'incomplete_expired':
    case 'paused':
      return 'canceled';
    case 'incomplete':
    default:
      return 'incomplete';
  }
}
