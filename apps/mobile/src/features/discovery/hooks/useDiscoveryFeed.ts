import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchDiscoveryFeed, submitSwipe, type DiscoveryCandidateDto, type SwipeDirection } from '../api/discovery.api';

const PLACEHOLDER_FEED: DiscoveryCandidateDto[] = [
  { id: 'placeholder-1', displayName: 'Ananya', age: 27 },
  { id: 'placeholder-2', displayName: 'Vikram', age: 30 },
];

/**
 * Loads the discovery feed and exposes a swipe handler. Placeholder data
 * keeps the deck navigable before the backend feed endpoint exists.
 */
export function useDiscoveryFeed() {
  const [swipedIds, setSwipedIds] = useState<string[]>([]);

  const query = useQuery({
    queryKey: ['discovery', 'feed'],
    queryFn: fetchDiscoveryFeed,
    initialData: PLACEHOLDER_FEED,
  });

  const candidates = query.data.filter((candidate) => !swipedIds.includes(candidate.id));

  async function swipe(candidateId: string, direction: SwipeDirection) {
    setSwipedIds((prev) => [...prev, candidateId]);
    await submitSwipe(candidateId, direction);
  }

  return { candidates, swipe };
}
