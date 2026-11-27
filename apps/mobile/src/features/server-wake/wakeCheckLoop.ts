import type { WakeCheckOutcome } from './api/serverWake.api';
import { isTerminalWakeState, toWakeState, type WakeState } from './wakeState';

export type WakeLoopDeps = {
  /** Performs one wake-check call. Injected so the retry-scheduling
   * logic below is testable without a real network call. */
  check: () => Promise<WakeCheckOutcome>;
  /** Called with every intermediate and the final state, so a caller
   * (e.g. the Zustand store) can keep UI in sync as the loop progresses. */
  onState: (state: WakeState) => void;
  /** Schedules `callback` to run after `delayMs`. Injected (rather than
   * calling `setTimeout` directly) so tests can run the loop
   * synchronously instead of depending on real timers. */
  scheduleRetry: (callback: () => void, delayMs: number) => void;
};

/**
 * Runs one wake-check, reports the resulting state via `onState`, and —
 * while that state is `starting` — keeps retrying after the
 * server-given delay (`retryAfterSeconds`) until a terminal state
 * (`running`, `error`, or `forbidden`) is reached, which it then
 * resolves with.
 */
export function runWakeCheckLoop(deps: WakeLoopDeps): Promise<WakeState> {
  return deps.check().then((outcome) => {
    const state = toWakeState(outcome);
    deps.onState(state);

    if (isTerminalWakeState(state)) {
      return state;
    }

    // Only `starting` is non-terminal, and it always carries retryAfterSeconds.
    const retryAfterSeconds = state.status === 'starting' ? state.retryAfterSeconds : 0;

    return new Promise<WakeState>((resolve) => {
      deps.scheduleRetry(() => {
        runWakeCheckLoop(deps).then(resolve);
      }, retryAfterSeconds * 1000);
    });
  });
}
