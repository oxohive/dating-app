import { isPremiumSubscription } from '../entitlement';
import { useMySubscription } from './useMySubscription';

/**
 * Whether the signed-in user currently has an active Premium subscription.
 * Shared by any feature that needs to gate UI (the GPS radius picker in
 * `discovery`/`profile`, the compatibility breakdown once it ships, etc) —
 * import this rather than re-deriving "is premium" from a raw subscription
 * object in multiple places.
 */
export function useIsPremium() {
  const { data: subscription, isLoading } = useMySubscription();
  return { isPremium: isPremiumSubscription(subscription), isLoading };
}
