import { useQuery } from '@tanstack/react-query';
import { fetchReceivedLikes, type LikeDto } from '../api/likes.api';

const PLACEHOLDER_LIKES: LikeDto[] = [];

/**
 * Loads the list of users who liked the current user. Placeholder empty
 * state keeps the screen navigable before the backend endpoint exists.
 */
export function useReceivedLikes() {
  return useQuery({
    queryKey: ['likes', 'received'],
    queryFn: fetchReceivedLikes,
    initialData: PLACEHOLDER_LIKES,
  });
}
