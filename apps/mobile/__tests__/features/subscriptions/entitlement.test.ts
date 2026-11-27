import { isPremiumSubscription } from '../../../src/features/subscriptions/entitlement';
import type { MySubscription } from '../../../src/features/subscriptions/api/subscriptions.api';

function subscription(overrides: Partial<MySubscription> = {}): MySubscription {
  return {
    id: 'sub-1',
    plan: 'monthly',
    status: 'active',
    startedAt: '2026-11-01T00:00:00.000Z',
    expiresAt: '2026-12-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('isPremiumSubscription', () => {
  it('returns true for an active subscription', () => {
    expect(isPremiumSubscription(subscription({ status: 'active' }))).toBe(true);
  });

  it('returns false for an expired subscription', () => {
    expect(isPremiumSubscription(subscription({ status: 'expired' }))).toBe(false);
  });

  it('returns false for a cancelled subscription', () => {
    expect(isPremiumSubscription(subscription({ status: 'cancelled' }))).toBe(false);
  });

  it('returns false when there is no subscription at all', () => {
    expect(isPremiumSubscription(null)).toBe(false);
    expect(isPremiumSubscription(undefined)).toBe(false);
  });
});
