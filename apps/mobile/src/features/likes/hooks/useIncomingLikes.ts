import { useQuery } from '@tanstack/react-query';
import { fetchIncomingLikes } from '../api/likes.api';

/**
 * Loads "who liked you" (`GET /likes/incoming`). Returns either the full
 * liker list (Premium) or a count-only teaser (free) — see
 * `IncomingLikesResult` in `likes.api.ts` for the shape.
 */
export function useIncomingLikes() {
  return useQuery({
    queryKey: ['likes', 'incoming'],
    queryFn: fetchIncomingLikes,
  });
}
