import { useMutation, useQueryClient } from '@tanstack/react-query';
import { blockProfile } from '../api/safety.api';

/**
 * Drives the block-user action (`POST /blocks`). Invalidates the feed,
 * matches and conversations caches on success since a block can affect
 * all three (discovery excludes blocked profiles; an existing match with
 * a blocked profile should no longer surface its conversation).
 */
export function useBlockUser(blockedProfileId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => blockProfile(blockedProfileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discovery', 'feed'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['messaging', 'conversations'] });
    },
  });

  return {
    block: mutation.mutate,
    isBlocking: mutation.isPending,
  };
}
