/**
 * Client for the env-wake Lambda's JSON mode (task 0018). The pilot EC2
 * instance's static Elastic IP was removed to save its small idle cost,
 * so the app discovers the backend's current address dynamically by
 * calling this Lambda instead of using a fixed config value.
 *
 * The exact JSON contract (pinned in
 * tasks/0018-mobile-dynamic-wake-discovery/plan.md so both the infra and
 * mobile subtasks can build in parallel without guessing):
 *   - 200 {"state": "running", "base_url": "http://<ip>"}
 *   - 200 {"state": "starting", "retry_after_seconds": 5}
 *   - 500 {"state": "error", "message": "..."}
 *   - 403 {"state": "forbidden"}
 */

export type WakeCheckOutcome =
  | { state: 'running'; base_url: string }
  | { state: 'starting'; retry_after_seconds: number }
  | { state: 'error'; message: string }
  | { state: 'forbidden' };

export type WakeFetchDeps = {
  /** Injected so this is testable without a real network call — matches
   * this app's existing DI testing pattern (see e.g.
   * `features/notifications/pushTokenRegistration.ts`). */
  fetchFn: typeof fetch;
  url: string;
  secret: string;
};

const DEFAULT_RETRY_AFTER_SECONDS = 5;

const GENERIC_NETWORK_ERROR_MESSAGE = 'Could not reach the wake-up service. Check your connection and try again.';
const GENERIC_UNEXPECTED_RESPONSE_MESSAGE = (status: number) => `Wake service returned an unexpected response (status ${status}).`;

/**
 * Parses the wake Lambda's JSON response body (already-parsed, or
 * `undefined` for an empty body) per the pinned contract above.
 * Defensively total over any status/body combination — an unexpected or
 * malformed shape maps to an `error` outcome rather than throwing, so
 * callers always get a well-formed, renderable result.
 */
export function parseWakeResponse(status: number, body: unknown): WakeCheckOutcome {
  const record = (body ?? {}) as Record<string, unknown>;

  if (status === 200 && record.state === 'running' && typeof record.base_url === 'string' && record.base_url.length > 0) {
    return { state: 'running', base_url: record.base_url };
  }

  if (status === 200 && record.state === 'starting') {
    const retryAfterSeconds = typeof record.retry_after_seconds === 'number' && record.retry_after_seconds > 0
      ? record.retry_after_seconds
      : DEFAULT_RETRY_AFTER_SECONDS;
    return { state: 'starting', retry_after_seconds: retryAfterSeconds };
  }

  if (status === 403) {
    return { state: 'forbidden' };
  }

  const message = typeof record.message === 'string' && record.message.length > 0
    ? record.message
    : GENERIC_UNEXPECTED_RESPONSE_MESSAGE(status);
  return { state: 'error', message };
}

/**
 * Calls the env-wake Lambda's JSON mode and maps the result to a
 * {@link WakeCheckOutcome}. Never throws — a connection-level failure
 * (the instance may not even be reachable yet) becomes an `error`
 * outcome too, so callers always get a terminal, well-formed result to
 * render instead of having to handle a rejected promise separately.
 */
export async function fetchWakeStatus(deps: WakeFetchDeps): Promise<WakeCheckOutcome> {
  try {
    const response = await deps.fetchFn(`${deps.url}?secret=${encodeURIComponent(deps.secret)}`, {
      headers: { Accept: 'application/json' },
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : undefined;
    return parseWakeResponse(response.status, body);
  } catch {
    return { state: 'error', message: GENERIC_NETWORK_ERROR_MESSAGE };
  }
}
