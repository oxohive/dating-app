import { apiClient } from '../../../core/apiClient';

export type DiscoveryCandidateDto = {
  id: string;
  displayName: string;
  age: number;
  photoUrl?: string;
};

export type SwipeDirection = 'like' | 'pass';

/**
 * TODO(backend-discovery-feed): wire up to the backend's discovery
 * feature slice once the candidate feed endpoint exists
 * (services/backend/discovery).
 */
export async function fetchDiscoveryFeed(): Promise<DiscoveryCandidateDto[]> {
  return apiClient.get<DiscoveryCandidateDto[]>('/discovery/feed');
}

/**
 * TODO(backend-discovery-swipe): wire up to the backend's discovery
 * feature slice once the swipe-decision endpoint exists
 * (services/backend/discovery).
 */
export async function submitSwipe(candidateId: string, direction: SwipeDirection): Promise<void> {
  await apiClient.post('/discovery/swipe', { candidateId, direction });
}
