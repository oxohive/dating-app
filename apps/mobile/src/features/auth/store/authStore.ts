import { create } from 'zustand';
import { configureAuthSession } from '../../../core/apiClient';
import { refreshSession } from '../api/auth.api';

export type AuthUser = {
  id: string;
  phoneNumber: string;
};

export type SetSessionInput = {
  userId: string;
  phoneNumber: string;
  accessToken: string;
  refreshToken: string;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setSession: (input: SetSessionInput) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearSession: () => void;
};

/**
 * Zustand slice for auth session state: the signed-in user plus the
 * access/refresh token pair. This is the single source of truth for
 * whether the app is authenticated; apiClient reads from it (via the
 * registration below) rather than this module reaching into apiClient's
 * internals.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  setSession: ({ userId, phoneNumber, accessToken, refreshToken }) =>
    set({ user: { id: userId, phoneNumber }, accessToken, refreshToken, isAuthenticated: true }),
  setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
  clearSession: () => set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
}));

// Ensures concurrent 401s trigger a single refresh call rather than a
// stampede of them racing to replace each other's tokens.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const currentRefreshToken = useAuthStore.getState().refreshToken;
  if (!currentRefreshToken) {
    return null;
  }

  if (!refreshInFlight) {
    refreshInFlight = refreshSession(currentRefreshToken)
      .then(({ accessToken, refreshToken }) => {
        useAuthStore.getState().setTokens(accessToken, refreshToken);
        return accessToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}

// Wires apiClient's generic auth-session hook up to this store. Done
// here (not in apiClient.ts) so core/ stays feature-agnostic.
configureAuthSession({
  getAccessToken: () => useAuthStore.getState().accessToken,
  refreshAccessToken,
  onSessionExpired: () => useAuthStore.getState().clearSession(),
});
