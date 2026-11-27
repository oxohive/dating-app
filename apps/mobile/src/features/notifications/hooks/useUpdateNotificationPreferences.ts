import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateNotificationPreferences, type UpdateNotificationPreferencesInput } from '../api/notifications.api';
import { NOTIFICATION_PREFERENCES_QUERY_KEY } from './useNotificationPreferences';

/**
 * Raw `PATCH /notifications/preferences` mutation. Kept separate from the
 * toggle-screen's own state handling (same split as `useUpdateProfile` vs
 * `useProfileEditForm`) so each hook has one job.
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateNotificationPreferencesInput) => updateNotificationPreferences(input),
    onSuccess: (preferences) => {
      queryClient.setQueryData(NOTIFICATION_PREFERENCES_QUERY_KEY, preferences);
    },
  });
}
