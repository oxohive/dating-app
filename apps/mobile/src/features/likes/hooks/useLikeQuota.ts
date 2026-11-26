import { useQuery } from '@tanstack/react-query';
import { fetchLikeQuota } from '../api/likes.api';

/**
 * Loads the current user's daily like quota (`GET /likes/quota`). Consumed
 * by both the dedicated Likes screen and the compact indicator embedded in
 * the Discovery screen, so both stay in sync via the shared query cache.
 */
export function useLikeQuota() {
  return useQuery({
    queryKey: ['likes', 'quota'],
    queryFn: fetchLikeQuota,
  });
}
