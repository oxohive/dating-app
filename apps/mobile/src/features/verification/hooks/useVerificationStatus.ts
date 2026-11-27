import { useQuery } from '@tanstack/react-query';
import { fetchMyVerificationState } from '../api/verification.api';

export const VERIFICATION_QUERY_KEY = ['verification', 'me'] as const;

/** Loads the signed-in user's current verification state (`null` if nothing submitted yet). */
export function useVerificationStatus() {
  return useQuery({
    queryKey: VERIFICATION_QUERY_KEY,
    queryFn: fetchMyVerificationState,
  });
}
