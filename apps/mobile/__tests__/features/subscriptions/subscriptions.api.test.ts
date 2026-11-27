import {
  buildSandboxCompleteBody,
  mapSubscriptionPlan,
  type SubscriptionPlanApiResponse,
} from '../../../src/features/subscriptions/api/subscriptions.api';

function planResponse(overrides: Partial<SubscriptionPlanApiResponse> = {}): SubscriptionPlanApiResponse {
  return {
    plan: 'monthly',
    label: 'Monthly',
    duration_days: 30,
    price_minor_units: 29900,
    currency: 'INR',
    ...overrides,
  };
}

describe('mapSubscriptionPlan', () => {
  it('synthesizes id/name from the backend\'s plan/label fields (no id/name on the wire)', () => {
    expect(mapSubscriptionPlan(planResponse({ plan: 'annual', label: 'Annual' }))).toEqual({
      id: 'annual',
      plan: 'annual',
      name: 'Annual',
      priceMinorUnits: 29900,
      currency: 'INR',
    });
  });

  it('maps price/currency straight through', () => {
    const mapped = mapSubscriptionPlan(planResponse({ price_minor_units: 999, currency: 'USD' }));
    expect(mapped.priceMinorUnits).toBe(999);
    expect(mapped.currency).toBe('USD');
  });
});

describe('buildSandboxCompleteBody', () => {
  it('wraps the plan in the body the backend requires, since it persists no pending-checkout row', () => {
    expect(buildSandboxCompleteBody('weekly')).toEqual({ plan: 'weekly' });
  });
});
