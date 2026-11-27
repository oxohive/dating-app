import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { getForegroundNotificationBehavior } from '../notificationHandler';

/**
 * Registers the app-wide foreground notification handler exactly once.
 * Must run before any notification could arrive, so it's mounted at the
 * app root alongside the other one-time providers in `App.tsx`.
 */
export function useConfigureNotificationHandler(): void {
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => getForegroundNotificationBehavior(),
    });
  }, []);
}
