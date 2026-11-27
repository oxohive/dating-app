import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuthStore } from '../../auth/store/authStore';
import { registerPushToken } from '../api/notifications.api';
import { registerForPushNotifications } from '../pushTokenRegistration';

// Remembers the most recently registered token so it can be unregistered
// again (e.g. by `useLogout`, from the auth feature) without that caller
// needing to know what the token was. `useLogout` lives outside M4's owned
// paths (`apps/mobile/src/features/auth/**`), so wiring the actual
// `unregisterPushToken` call into it is left for integration — see this
// module's final export, `getLastRegisteredPushToken`.
let lastRegisteredPushToken: string | null = null;

/** The last token this device successfully registered, if any. */
export function getLastRegisteredPushToken(): string | null {
  return lastRegisteredPushToken;
}

/**
 * Requests push-notification permission and registers this device's Expo
 * push token with the backend, once the user is signed in (per the task
 * brief: "on app foreground/login"). A denied permission or an unsupported
 * platform (web) both resolve quietly — no crash, no retry loop, just no
 * registration — via `registerForPushNotifications`'s tagged result.
 *
 * Mounted once at the app root (`NotificationsBootstrap`), not per-screen,
 * so it runs exactly once per sign-in rather than once per screen mount.
 */
export function usePushTokenRegistration(): void {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let isCancelled = false;

    registerForPushNotifications({
      platformOS: Platform.OS,
      getPermissionsAsync: Notifications.getPermissionsAsync,
      requestPermissionsAsync: Notifications.requestPermissionsAsync,
      getExpoPushTokenAsync: () => Notifications.getExpoPushTokenAsync(),
      registerToken: registerPushToken,
    }).then((result) => {
      if (!isCancelled && result.outcome === 'registered') {
        lastRegisteredPushToken = result.token;
      }
      // 'permission_denied' / 'unsupported_platform' / 'error' are all
      // silent no-ops by design — see this hook's docstring.
    });

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated]);
}
