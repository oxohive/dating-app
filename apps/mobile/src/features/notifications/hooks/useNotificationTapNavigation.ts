import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { navigate } from '../../../app/navigation/navigationRef';
import { resolveNotificationNavigationTarget } from '../notificationNavigation';

/**
 * Listens for a tapped notification (foreground or background/killed-state
 * launch) and navigates to the screen `resolveNotificationNavigationTarget`
 * resolves for it. Every target is an existing route already registered on
 * `RootNavigator` (Matches, Conversation, VerificationStatus,
 * SubscriptionStatus) plus the two new screens this subtask adds
 * (IncomingLikes, and — not a tap target itself —
 * NotificationPreferences).
 *
 * Uses the shared `navigationRef` (not `useNavigation()`): this hook runs
 * inside `NotificationsBootstrap`, which is mounted as a sibling of
 * `RootNavigator` rather than a screen inside it, so there's no navigator
 * context for `useNavigation()` to attach to.
 */
export function useNotificationTapNavigation(): void {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      const target = resolveNotificationNavigationTarget(data);

      if (!target) {
        return;
      }

      if (target.screen === 'Conversation') {
        navigate('Conversation', target.params);
      } else {
        navigate(target.screen);
      }
    });

    return () => subscription.remove();
  }, []);
}
