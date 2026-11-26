import { useQuery } from '@tanstack/react-query';
import { fetchMatches, type MatchDto } from '../api/matches.api';

const PLACEHOLDER_MATCHES: MatchDto[] = [];

/**
 * Loads the current user's matches. Placeholder empty state keeps the
 * screen navigable before the backend endpoint exists.
 */
export function useMatches() {
  return useQuery({
    queryKey: ['matches'],
    queryFn: fetchMatches,
    initialData: PLACEHOLDER_MATCHES,
  });
}
