import { apiClient } from '../../../core/apiClient';

export type MatchDto = {
  id: string;
  displayName: string;
  photoUrl?: string;
  matchedAt: string;
};

/**
 * TODO(backend-matches-list): wire up to the backend's matches feature
 * slice once the matches list endpoint exists
 * (services/backend/matches).
 */
export async function fetchMatches(): Promise<MatchDto[]> {
  return apiClient.get<MatchDto[]>('/matches');
}
