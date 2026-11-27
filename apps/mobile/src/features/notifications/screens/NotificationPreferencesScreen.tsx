import { FlatList, Text } from 'react-native';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { ErrorText } from '../../../components/ErrorText';
import { getApiErrorMessage } from '../../../core/apiErrorMessage';
import { spacing, typography } from '../../../core/theme';
import { NotificationPreferenceToggle } from '../components/NotificationPreferenceToggle';
import { useNotificationPreferences } from '../hooks/useNotificationPreferences';
import { useUpdateNotificationPreferences } from '../hooks/useUpdateNotificationPreferences';
import { NOTIFICATION_PREFERENCE_FIELDS, togglePreference, type NotificationPreferenceKey } from '../preferences';

/**
 * Notification-preferences screen: thin composition only. Data comes from
 * useNotificationPreferences; the toggle rows come from
 * NOTIFICATION_PREFERENCE_FIELDS + NotificationPreferenceToggle. Toggling a
 * switch optimistically flips local state (`togglePreference`) and fires a
 * single-field PATCH — if it fails, the query cache (not yet updated,
 * since the mutation hasn't resolved) is left as the source of truth and
 * a refetch/ErrorText surfaces the problem rather than silently reverting.
 *
 * Reachable today only by direct navigation to `NotificationPreferences` —
 * no feature in M4's owned paths (`notifications/**`, `likes/**`) has a
 * natural entry point into Settings. Adding a nav link (e.g. from
 * `ProfileScreen`) is outside `apps/mobile/src/features/profile/**`, which
 * isn't an M4-owned path — flagged for integration.
 */
export function NotificationPreferencesScreen() {
  const { data: preferences, isLoading, error } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();

  function handleToggle(key: NotificationPreferenceKey) {
    if (!preferences) {
      return;
    }
    const next = togglePreference(preferences, key);
    updateMutation.mutate({ [key]: next[key] });
  }

  if (isLoading) {
    return (
      <ScreenContainer>
        <Text>Loading your notification preferences...</Text>
      </ScreenContainer>
    );
  }

  if (error || !preferences) {
    return (
      <ScreenContainer>
        <ErrorText message={error ? getApiErrorMessage(error) : 'Could not load notification preferences.'} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={typography.title}>Notifications</Text>
      <Text style={{ ...typography.caption, marginBottom: spacing.sm }}>
        Security alerts are always sent and can&apos;t be turned off.
      </Text>
      <FlatList
        data={NOTIFICATION_PREFERENCE_FIELDS}
        keyExtractor={(field) => field.key}
        renderItem={({ item }) => (
          <NotificationPreferenceToggle
            disabled={updateMutation.isPending}
            field={item}
            onToggle={handleToggle}
            value={preferences[item.key]}
          />
        )}
      />
    </ScreenContainer>
  );
}
