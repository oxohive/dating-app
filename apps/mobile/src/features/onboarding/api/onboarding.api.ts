import { apiClient } from '../../../core/apiClient';

export type OnboardingProfileInput = {
  displayName: string;
  birthDate: string;
  bio: string;
};

/**
 * TODO(backend-onboarding-submit): wire up to the backend's onboarding
 * feature slice once the profile-creation endpoint exists
 * (services/backend/onboarding).
 */
export async function submitOnboardingProfile(input: OnboardingProfileInput): Promise<{ profileId: string }> {
  return apiClient.post<{ profileId: string }>('/onboarding/profile', input);
}
