import { create } from 'zustand';

export type AuthUser = {
  id: string;
  phoneNumber: string;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setSession: (user: AuthUser, accessToken: string) => void;
  clearSession: () => void;
};

/**
 * Zustand slice for auth session state. Kept deliberately small for the
 * MVP: just enough to gate navigation between the auth stack and the
 * authenticated app stack.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  setSession: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
  clearSession: () => set({ user: null, accessToken: null, isAuthenticated: false }),
}));
