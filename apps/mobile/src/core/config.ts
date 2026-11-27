/**
 * Centralized runtime configuration. Everything that varies between
 * environments (local, staging, prod) should be read here, and nowhere
 * else, so it stays easy to audit.
 */

// Expo exposes env vars prefixed with EXPO_PUBLIC_ to client code via
// process.env at build time. Falls back to a local dev default so the app
// boots out of the box during the MVP phase.
const DEFAULT_API_BASE_URL = 'http://localhost:4000';

// env-wake Lambda Function URL (task 0018). The pilot EC2 instance's
// static Elastic IP was removed to save its small idle cost, so the app
// discovers the backend's current address dynamically through this
// Lambda on every launch/foreground (see features/server-wake) instead
// of a fixed `apiBaseUrl`. This default is the real, already-deployed
// Function URL — not a secret — so it's safe to ship as the fallback the
// same way `DEFAULT_API_BASE_URL` is.
const DEFAULT_SERVER_WAKE_URL = 'https://yv2yfc7fvipbrfhru4miygaix40ozzvj.lambda-url.ap-south-1.on.aws/';

export const config = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL,
  /**
   * env-wake Lambda Function URL, overridable per environment the same
   * way `apiBaseUrl` is.
   */
  serverWakeUrl: process.env.EXPO_PUBLIC_SERVER_WAKE_URL ?? DEFAULT_SERVER_WAKE_URL,
  /**
   * Shared secret required by the env-wake Lambda's `?secret=` query
   * param. This is a deliberately simple convenience gate against
   * random internet abuse, not a login system (same accepted-risk
   * framing as the Lambda's own design — see
   * `lambda/env-wake/handler.py` and `docs/runbooks/env-start-stop.md`).
   * Like any `EXPO_PUBLIC_*` value, it ships inside the built app bundle
   * and is visible to anyone who inspects it — expected and fine here.
   * Left unset, the Lambda just returns `forbidden`, which the app
   * surfaces as a clear error screen rather than failing silently.
   */
  serverWakeSecret: process.env.EXPO_PUBLIC_SERVER_WAKE_SECRET ?? '',
};
