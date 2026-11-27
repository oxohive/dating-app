import { useMemo, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { submitLike } from '../../likes/api/likes.api';
import { useIsPremium } from '../../subscriptions/hooks/useIsPremium';
import { fetchDiscoveryFeed, passProfile, type DiscoveryProfile } from '../api/discovery.api';
import { resolveEffectiveRadius } from '../radius';
import { useDiscoveryPreferencesStore } from '../store/discoveryPreferencesStore';
import type { SwipeDirection } from '../components/SwipeDeck';

export type MatchCelebrationState = {
  matchId: string;
  matchedProfile: DiscoveryProfile;
};

/**
 * Loads the discovery feed and drives swipe decisions:
 *  - swipe-left calls `POST /discovery/pass`
 *  - swipe-right calls `POST /likes` and surfaces either a match
 *    celebration (`matched: true`) or the quota-exceeded state (403)
 *
 * Pages are fetched via `useQueries` (one query per offset already
 * visited) rather than copying query results into local state in a
 * `useEffect` — the next page is requested from inside the `swipe` event
 * handler once the current page is close to exhausted, so there's no
 * setState-in-effect cascade.
 */
export function useDiscoveryFeed() {
  const queryClient = useQueryClient();
  const [offsets, setOffsets] = useState<number[]>([0]);
  const [swipedIds, setSwipedIds] = useState<string[]>([]);
  const [match, setMatch] = useState<MatchCelebrationState | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const { isPremium } = useIsPremium();
  const selectedRadius = useDiscoveryPreferencesStore((state) => state.radius);
  const effectiveRadius = resolveEffectiveRadius(isPremium, selectedRadius);

  const pageQueries = useQueries({
    queries: offsets.map((offset) => ({
      queryKey: ['discovery', 'feed', offset, effectiveRadius] as const,
      queryFn: () => fetchDiscoveryFeed(offset, undefined, effectiveRadius),
    })),
  });

  const profiles = useMemo(() => pageQueries.flatMap((page) => page.data?.profiles ?? []), [pageQueries]);
  const lastPage = pageQueries[pageQueries.length - 1];
  const nextOffset = lastPage?.data?.next_offset ?? null;
  const isLoading = pageQueries.some((page) => page.isLoading);
  const isFetchingMore = pageQueries.some((page) => page.isFetching);

  const candidates = profiles.filter((profile) => !swipedIds.includes(profile.id));

  function loadMoreIfRunningLow() {
    if (candidates.length <= 1 && nextOffset !== null && !offsets.includes(nextOffset) && !isFetchingMore) {
      setOffsets((prev) => [...prev, nextOffset]);
    }
  }

  async function swipe(candidateId: string, direction: SwipeDirection) {
    const candidate = profiles.find((item) => item.id === candidateId);
    if (!candidate) return;

    setSwipedIds((prev) => [...prev, candidateId]);
    loadMoreIfRunningLow();

    if (direction === 'pass') {
      await passProfile(candidateId);
      return;
    }

    const result = await submitLike(candidateId);

    if (result.outcome === 'quota_exceeded') {
      setQuotaExceeded(true);
      // The like never actually registered — put the candidate back so the
      // user can still pass, or try again once the quota resets.
      setSwipedIds((prev) => prev.filter((id) => id !== candidateId));
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['likes', 'quota'] });

    if (result.matched) {
      setMatch({ matchId: result.matchId, matchedProfile: candidate });
    }
  }

  return {
    candidates,
    isLoading,
    swipe,
    match,
    dismissMatch: () => setMatch(null),
    quotaExceeded,
    dismissQuotaExceeded: () => setQuotaExceeded(false),
  };
}
