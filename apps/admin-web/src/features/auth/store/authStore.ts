import { create } from "zustand";
import {
  clearAccessToken as clearStoredAccessToken,
  getAccessToken,
  setAccessToken as setStoredAccessToken,
} from "@/lib/authToken";

export interface AuthState {
  accessToken: string | null;
  isAuthenticated: boolean;
  setAccessToken: (token: string) => void;
  clearAccessToken: () => void;
}

/**
 * Single source of truth for the admin's auth state. `localStorage` (via
 * `src/lib/authToken.ts`) remains the persistence layer underneath - this
 * store just makes that state reactive so components (e.g. `Sidebar`,
 * `RequireAdminAuth`) re-render when it changes, instead of each one doing
 * its own ad-hoc `localStorage` read.
 *
 * The store's initial state is hydrated once, at module load, from whatever
 * token is already in `localStorage` - this is what makes "signed in,
 * survives a page refresh" keep working: on a fresh page load the store
 * starts already-authenticated if a token was persisted from a prior
 * session, with no extra effect/round trip needed.
 */
export const useAuthStore = create<AuthState>((set) => {
  const initialToken = getAccessToken();

  return {
    accessToken: initialToken,
    isAuthenticated: initialToken !== null,
    setAccessToken: (token: string) => {
      setStoredAccessToken(token);
      set({ accessToken: token, isAuthenticated: true });
    },
    clearAccessToken: () => {
      clearStoredAccessToken();
      set({ accessToken: null, isAuthenticated: false });
    },
  };
});
