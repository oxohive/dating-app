import { useConfigureNotificationHandler } from '../hooks/useConfigureNotificationHandler';
import { useNotificationTapNavigation } from '../hooks/useNotificationTapNavigation';
import { usePushTokenRegistration } from '../hooks/usePushTokenRegistration';

/**
 * Renders nothing — this is the app-root wiring point for push
 * notifications, mounted once inside `NavigationContainer` (so the tap
 * handler can navigate) and `QueryClientProvider` (so registration can call
 * the backend). Keeps `App.tsx`'s own diff to a single added line.
 */
export function NotificationsBootstrap(): null {
  useConfigureNotificationHandler();
  usePushTokenRegistration();
  useNotificationTapNavigation();
  return null;
}
