/**
 * Centralized runtime configuration. Everything that varies between
 * environments (local, staging, prod) should be read here, and nowhere
 * else, so it stays easy to audit.
 */

// Expo exposes env vars prefixed with EXPO_PUBLIC_ to client code via
// process.env at build time. Falls back to a local dev default so the app
// boots out of the box during the MVP phase.
const DEFAULT_API_BASE_URL = 'http://localhost:4000';

export const config = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL,
};
