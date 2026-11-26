import { useMutation } from '@tanstack/react-query';
import { logout } from '../api/auth.api';
import { useAuthStore } from '../store/authStore';

/**
 * Logs the current session out: best-effort revokes the refresh token on
 * the backend, then always clears local session state so the UI can
 * route back to the auth stack regardless of the network outcome.
 */
export function useLogout() {
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const clearSession = useAuthStore((state) => state.clearSession);

  const mutation = useMutation({
    mutationFn: async () => {
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
