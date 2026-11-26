import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMatches, unmatch, type MatchDto } from '../api/matches.api';

const PLACEHOLDER_MATCHES: MatchDto[] = [];

/**
 * Loads the current user's matches (`GET /matches`) and exposes an
 * unmatch mutation (`POST /matches/{id}/unmatch`) that invalidates the
 * list on success.
 */
export function useMatches() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['matches'],
    queryFn: fetchMatches,
    initialData: PLACEHOLDER_MATCHES,
  });

  const unmatchMutation = useMutation({
    mutationFn: unmatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });

  return {
    matches: query.data,
    isLoading: query.isLoading,
    unmatch: unmatchMutation.mutate,
  };
}
