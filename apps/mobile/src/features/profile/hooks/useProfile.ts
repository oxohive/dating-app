import { useQuery } from '@tanstack/react-query';
import { fetchMyProfile } from '../api/profile.api';

export const PROFILE_QUERY_KEY = ['profile', 'me'] as const;

/** Loads the current user's profile via TanStack Query. */
export function useProfile() {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: fetchMyProfile,
  });
}
