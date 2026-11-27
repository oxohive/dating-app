import type { SubscriptionPlan } from './api/subscriptions.api';

/**
 * Formats a plan's minor-units price (e.g. paise) into a display string
 * (e.g. "₹299.00"). Pulled out as a pure function so it's independently
 * testable without rendering `PlanOptionCard`.
 */
export function formatPlanPrice(plan: Pick<SubscriptionPlan, 'priceMinorUnits' | 'currency'>): string {
  const majorUnits = plan.priceMinorUnits / 100;
  const formatted = majorUnits.toFixed(2);

  if (plan.currency === 'INR') {
    return `₹${formatted}`;
  }

  return `${formatted} ${plan.currency}`;
}
