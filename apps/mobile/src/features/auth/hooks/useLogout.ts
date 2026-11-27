import { useMutation } from '@tanstack/react-query';
import { unregisterPushToken } from '../../notifications/api/notifications.api';
import { getLastRegisteredPushToken } from '../../notifications/hooks/usePushTokenRegistration';
import { logout } from '../api/auth.api';
import { useAuthStore } from '../store/authStore';

/**
 * Logs the current session out: best-effort revokes the refresh token and
 * unregisters this device's push token on the backend, then always clears
 * local session state so the UI can route back to the auth stack
 * regardless of either network call's outcome.
 */
export function useLogout() {
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const clearSession = useAuthStore((state) => state.clearSession);

  const mutation = useMutation({
    mutationFn: async () => {
      const token = getLastRegisteredPushToken();
      if (token) {
        await unregisterPushToken(token).catch(() => undefined);
      }
      if (refreshToken) {
        await logout(refreshToken).catch(() => undefined);
      }
    },
    onSettled: () => clearSession(),
  });

  return {
    logOut: () => mutation.mutate(),
    isLoggingOut: mutation.isPending,
  };
}
