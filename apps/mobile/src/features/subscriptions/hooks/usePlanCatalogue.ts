import { useQuery } from '@tanstack/react-query';
import { fetchPlanCatalogue } from '../api/subscriptions.api';

/** Loads the plan catalogue shown on the upsell/plans screen. */
export function usePlanCatalogue() {
  return useQuery({
    queryKey: ['subscriptions', 'plans'] as const,
    queryFn: fetchPlanCatalogue,
  });
}
