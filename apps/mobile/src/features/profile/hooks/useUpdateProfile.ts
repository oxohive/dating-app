import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMyProfile, type UpdateProfileInput } from '../api/profile.api';
import { PROFILE_QUERY_KEY } from './useProfile';

/**
 * Raw `PATCH /profiles/me` mutation. Kept separate from the edit-form
 * field state (useProfileEditForm) so each hook has one job.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateMyProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, profile);
    },
  });
}
