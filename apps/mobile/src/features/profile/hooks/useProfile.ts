import { useQuery } from '@tanstack/react-query';
import { fetchMyProfile, type ProfileDto } from '../api/profile.api';

const PLACEHOLDER_PROFILE: ProfileDto = {
  id: 'placeholder',
  displayName: 'Your name',
  bio: 'Add a bio to tell people about yourself.',
  photoUrls: [],
};

/**
 * Loads the current user's profile via TanStack Query. Until the backend
 * endpoint exists, callers see placeholder data instead of an error so the
 * skeleton stays navigable.
 */
export function useProfile() {
  const query = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: fetchMyProfile,
    initialData: PLACEHOLDER_PROFILE,
  });

  return query;
}
