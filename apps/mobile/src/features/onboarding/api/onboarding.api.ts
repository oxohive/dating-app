import { apiClient } from '../../../core/apiClient';

export type RelationshipIntention = 'serious' | 'casual' | 'open' | 'figuring_out';

export type OnboardingProfileInput = {
  displayName: string;
  dateOfBirth: string;
  gender: string;
  orientationPreferences: string[];
  relationshipIntention: RelationshipIntention;
  city: string;
  locality: string;
  bio?: string;
  interests?: string[];
};

export type OnboardingProfileResult = {
  id: string;
  displayName: string;
};

type OnboardingProfileApiResponse = {
  id: string;
  display_name: string;
};

/**
 * Submits the newly-created profile at the end of onboarding.
 * `POST /onboarding/profile` responds 201 with the created Profile.
 */
export async function submitOnboardingProfile(input: OnboardingProfileInput): Promise<OnboardingProfileResult> {
  const response = await apiClient.post<OnboardingProfileApiResponse>('/onboarding/profile', {
    display_name: input.displayName,
    date_of_birth: input.dateOfBirth,
    gender: input.gender,
    orientation_preferences: input.orientationPreferences,
    relationship_intention: input.relationshipIntention,
    city: input.city,
    locality: input.locality,
    ...(input.bio ? { bio: input.bio } : {}),
    ...(input.interests && input.interests.length > 0 ? { interests: input.interests } : {}),
  });

  return { id: response.id, displayName: response.display_name };
}
