import { apiClient } from '../../../core/apiClient';

export type LikeDto = {
  id: string;
  displayName: string;
  photoUrl?: string;
};

/**
 * TODO(backend-likes-received): wire up to the backend's likes feature
 * slice once the "who liked me" endpoint exists
 * (services/backend/likes).
 */
export async function fetchReceivedLikes(): Promise<LikeDto[]> {
  return apiClient.get<LikeDto[]>('/likes/received');
}
