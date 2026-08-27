import { BillingCycle, BundleTier } from './subscription.enums';

/**
 * `maxMessages: null` means unlimited (Enterprise). Yearly prices are a
 * ~17% discount over 12x the monthly price, a common SaaS pattern.
 */
export const BUNDLE_PLANS: Record<
  BundleTier,
  {
    maxMessages: number | null;
    monthlyPrice: number;
    yearlyPrice: number;
  }
> = {
  [BundleTier.BASIC]: {
    maxMessages: 10,
    monthlyPrice: 9.99,
    yearlyPrice: 99.99,
  },
  [BundleTier.PRO]: {
    maxMessages: 100,
    monthlyPrice: 29.99,
    yearlyPrice: 299.99,
  },
  [BundleTier.ENTERPRISE]: {
    maxMessages: null,
    monthlyPrice: 99.99,
    yearlyPrice: 999.99,
  },
};

export function priceFor(tier: BundleTier, cycle: BillingCycle): number {
  const plan = BUNDLE_PLANS[tier];
  return cycle === BillingCycle.MONTHLY ? plan.monthlyPrice : plan.yearlyPrice;
}

export function maxMessagesFor(tier: BundleTier): number | null {
  return BUNDLE_PLANS[tier].maxMessages;
}

export function addCycle(date: Date, cycle: BillingCycle): Date {
  const next = new Date(date);
  if (cycle === BillingCycle.MONTHLY) {
    next.setMonth(next.getMonth() + 1);
  } else {
    next.setFullYear(next.getFullYear() + 1);
  }
  return next;
}
