const ACCESS_TOKEN_KEY = "admin_access_token";

/**
 * Thin localStorage wrapper for the admin JWT access token. Centralized
 * here so the api client and auth feature never touch `window.localStorage`
 * directly. Guards every call for SSR (Next.js renders this module on the
 * server too, where `window` is undefined).
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}
