import { useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import type { RootNavigationProp } from '../../../app/navigation/RootNavigator';
import { resolveNotificationNavigationTarget } from '../notificationNavigation';

/**
 * Listens for a tapped notification (foreground or background/killed-state
 * launch) and navigates to the screen `resolveNotificationNavigationTarget`
 * resolves for it. Every target is an existing route already registered on
 * `RootNavigator` (Matches, Conversation, VerificationStatus,
 * SubscriptionStatus) plus the two new screens this subtask adds
 * (IncomingLikes, and — not a tap target itself —
 * NotificationPreferences).
 */
export function useNotificationTapNavigation(): void {
  const navigation = useNavigation<RootNavigationProp>();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      const target = resolveNotificationNavigationTarget(data);

      if (!target) {
        return;
      }

      if (target.screen === 'Conversation') {
        navigation.navigate('Conversation', target.params);
      } else {
        navigation.navigate(target.screen);
      }
    });

    return () => subscription.remove();
  }, [navigation]);
}
