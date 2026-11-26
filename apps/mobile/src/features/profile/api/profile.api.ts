import { apiClient } from '../../../core/apiClient';

export type ProfileDto = {
  id: string;
  displayName: string;
  bio: string;
  photoUrls: string[];
};

/**
 * TODO(backend-profile-get): wire up to the backend's profile feature
 * slice once the "get my profile" endpoint exists
 * (services/backend/profile).
 */
export async function fetchMyProfile(): Promise<ProfileDto> {
  return apiClient.get<ProfileDto>('/profile/me');
}
