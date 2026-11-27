import { colors } from '../../core/theme';
import type { SubscriptionStatus } from './api/subscriptions.api';

export type SubscriptionStatusDisplay = {
  label: string;
  color: string;
};

/**
 * Maps a subscription status to its display label/color. Pulled out as a
 * pure function (same pattern as `describeVerificationStatus` in the
 * verification feature) so the mapping is unit-testable without rendering.
 */
export function describeSubscriptionStatus(status: SubscriptionStatus): SubscriptionStatusDisplay {
  switch (status) {
    case 'active':
      return { label: 'Active', color: colors.success };
    case 'expired':
      return { label: 'Expired', color: colors.textMuted };
    case 'cancelled':
      return { label: 'Cancelled', color: colors.danger };
    default:
      return { label: status, color: colors.textMuted };
  }
}
