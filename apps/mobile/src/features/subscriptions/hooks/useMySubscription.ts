import { useQuery } from '@tanstack/react-query';
import { fetchMySubscription } from '../api/subscriptions.api';

export const MY_SUBSCRIPTION_QUERY_KEY = ['subscriptions', 'me'] as const;

/** Loads the signed-in user's current subscription (`null` if none). */
export function useMySubscription() {
  return useQuery({
    queryKey: MY_SUBSCRIPTION_QUERY_KEY,
    queryFn: fetchMySubscription,
  });
}
