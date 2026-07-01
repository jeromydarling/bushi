import { SUBSCRIPTION_TIERS, type SubscriptionTier } from '@bushi/domain';

/** Plan tiers mirror the domain subscription tiers. */
export type PlanTier = SubscriptionTier;

export type BillingInterval = 'monthly' | 'annual';

export interface PlanPricing {
  /** Price in the smallest currency unit (cents). */
  monthly: number;
  annual: number;
}

/** Subscription plan pricing in USD cents. */
export const PRICES: Record<PlanTier, PlanPricing> = {
  free: { monthly: 0, annual: 0 },
  starter: { monthly: 2900, annual: 29000 },
  pro: { monthly: 9900, annual: 99000 },
  enterprise: { monthly: 49900, annual: 499000 },
};

export type AddOnKey = 'marketing_automation' | 'school_profile_premium';

/** Recurring add-ons, priced per interval in cents. */
export const ADD_ONS: Record<AddOnKey, PlanPricing> = {
  marketing_automation: { monthly: 4900, annual: 49000 },
  school_profile_premium: { monthly: 1900, annual: 19000 },
};

/** Convenience: all valid plan tiers (re-exported for callers). */
export const PLAN_TIERS = SUBSCRIPTION_TIERS;

/** Look up a price in cents for a tier + interval. */
export function priceForPlan(tier: PlanTier, interval: BillingInterval): number {
  return PRICES[tier][interval];
}
