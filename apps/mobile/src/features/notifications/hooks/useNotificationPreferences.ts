import { useQuery } from '@tanstack/react-query';
import { fetchNotificationPreferences } from '../api/notifications.api';

export const NOTIFICATION_PREFERENCES_QUERY_KEY = ['notifications', 'preferences'] as const;

/** Loads the signed-in user's current notification-preference toggles. */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: NOTIFICATION_PREFERENCES_QUERY_KEY,
    queryFn: fetchNotificationPreferences,
  });
}
