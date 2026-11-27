import type { PushTokenPlatform } from './api/notifications.api';

/**
 * Maps `Platform.OS` to the two platforms the backend's `push_tokens` table
 * accepts (`"ios" | "android"`, per plan.md). Anything else (e.g. `"web"`,
 * which Expo also reports) has no FCM/APNs delivery path, so registration
 * is skipped rather than guessed at.
 */
export function resolvePushTokenPlatform(osName: string): PushTokenPlatform | null {
  return osName === 'ios' || osName === 'android' ? osName : null;
}

export type PermissionStatusResult = { status: string };
export type ExpoPushTokenResult = { data: string };

/**
 * Everything `registerForPushNotifications` needs from the outside world,
 * injected rather than imported directly from `expo-notifications`/
 * `react-native`. This is what makes the success/permission-denied/
 * unsupported-platform/error branches testable as plain function calls,
 * with no native-module mocking required.
 */
export type PushRegistrationDeps = {
  platformOS: string;
  getPermissionsAsync: () => Promise<PermissionStatusResult>;
  requestPermissionsAsync: () => Promise<PermissionStatusResult>;
  getExpoPushTokenAsync: () => Promise<ExpoPushTokenResult>;
  registerToken: (token: string, platform: PushTokenPlatform) => Promise<void>;
};

export type PushRegistrationResult =
  | { outcome: 'registered'; token: string }
  | { outcome: 'permission_denied' }
  | { outcome: 'unsupported_platform' }
  | { outcome: 'error'; error: unknown };

/**
 * Drives the full "foreground/login" push-token registration flow: resolve
 * the platform, check (then request, if needed) notification permission,
 * obtain the device's Expo push token, and register it with the backend.
 *
 * Never throws — a denied permission, an unsupported platform (e.g. web),
 * or any failure along the way (including the backend call) all resolve to
 * a tagged result instead, so a caller can skip registration gracefully
 * without needing a try/catch of its own.
 */
export async function registerForPushNotifications(deps: PushRegistrationDeps): Promise<PushRegistrationResult> {
  const platform = resolvePushTokenPlatform(deps.platformOS);
  if (!platform) {
    return { outcome: 'unsupported_platform' };
  }

  try {
    const current = await deps.getPermissionsAsync();
    let status = current.status;

    if (status !== 'granted') {
      const requested = await deps.requestPermissionsAsync();
      status = requested.status;
    }

    if (status !== 'granted') {
      return { outcome: 'permission_denied' };
    }

    const { data: token } = await deps.getExpoPushTokenAsync();
    await deps.registerToken(token, platform);
    return { outcome: 'registered', token };
  } catch (error) {
    return { outcome: 'error', error };
  }
}
