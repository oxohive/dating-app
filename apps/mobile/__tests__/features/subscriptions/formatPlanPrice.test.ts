import { formatPlanPrice } from '../../../src/features/subscriptions/formatPlanPrice';

describe('formatPlanPrice', () => {
  it('formats INR minor units with a rupee sign', () => {
    expect(formatPlanPrice({ priceMinorUnits: 29900, currency: 'INR' })).toBe('₹299.00');
  });

  it('formats a non-INR currency with its code', () => {
    expect(formatPlanPrice({ priceMinorUnits: 999, currency: 'USD' })).toBe('9.99 USD');
  });
});
