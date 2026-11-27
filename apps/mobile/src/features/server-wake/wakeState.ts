import type { WakeCheckOutcome } from './api/serverWake.api';

/**
 * UI-facing state machine for the server-wake flow (task 0018):
 * `checking` (initial, or re-checking) -> `running` | `starting` |
 * `error` | `forbidden`. `starting` is the only non-terminal state — the
 * loop in `wakeCheckLoop.ts` keeps retrying from there until a terminal
 * state is reached.
 */
export type WakeState =
  | { status: 'checking' }
  | { status: 'running'; baseUrl: string }
  | { status: 'starting'; retryAfterSeconds: number }
  | { status: 'error'; message: string }
  | { status: 'forbidden' };

/** Maps a parsed wake-Lambda outcome onto the UI-facing state machine's
 * states. Pure and total over every outcome shape `parseWakeResponse`
 * can produce. */
export function toWakeState(outcome: WakeCheckOutcome): WakeState {
  switch (outcome.state) {
    case 'running':
      return { status: 'running', baseUrl: outcome.base_url };
    case 'starting':
      return { status: 'starting', retryAfterSeconds: outcome.retry_after_seconds };
    case 'forbidden':
      return { status: 'forbidden' };
    case 'error':
      return { status: 'error', message: outcome.message };
    default:
      return { status: 'error', message: 'Unknown wake-check response.' };
  }
}

/** True for every state except `starting` (the only one that schedules a
 * retry) — `checking` is transient too, but it isn't produced by
 * `toWakeState` and is only ever the loop's own starting point. */
export function isTerminalWakeState(state: WakeState): boolean {
  return state.status !== 'starting';
}
