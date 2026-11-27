import { create } from 'zustand';
import { configureDynamicBaseUrl, configureServerWakeRecovery } from '../../../core/apiClient';
import { config } from '../../../core/config';
import { fetchWakeStatus } from '../api/serverWake.api';
import { runWakeCheckLoop } from '../wakeCheckLoop';
import type { WakeState } from '../wakeState';

type ServerWakeStoreState = {
  wakeState: WakeState;
  setWakeState: (wakeState: WakeState) => void;
};

/**
 * Zustand slice holding the server-wake flow's current state (task
 * 0018). In-memory only, intentionally not persisted: the discovered
 * `base_url` can go stale across app restarts if the instance stopped
 * and came back with a different IP meanwhile, so it's always
 * re-checked on launch rather than restored from disk.
 */
export const useServerWakeStore = create<ServerWakeStoreState>((set) => ({
  wakeState: { status: 'checking' },
  setWakeState: (wakeState) => set({ wakeState }),
}));

// Ensures concurrent triggers (e.g. the startup gate and a mid-session
// API-call network failure racing each other) share a single in-flight
// check loop instead of each kicking off its own retry timer.
let checkInFlight: Promise<WakeState> | null = null;

/**
 * Runs the wake-check loop (one call, then retries while `starting`)
 * and updates the shared store as it progresses. Safe to call multiple
 * times — concurrent calls share the same in-flight loop and resolve
 * together once it reaches a terminal state.
 */
export function runWakeCheck(): Promise<WakeState> {
  if (!checkInFlight) {
    useServerWakeStore.getState().setWakeState({ status: 'checking' });
    checkInFlight = runWakeCheckLoop({
      check: () =>
        fetchWakeStatus({
          fetchFn: fetch,
          url: config.serverWakeUrl,
          secret: config.serverWakeSecret,
        }),
      onState: (state) => useServerWakeStore.getState().setWakeState(state),
      scheduleRetry: (callback, delayMs) => setTimeout(callback, delayMs),
    }).finally(() => {
      checkInFlight = null;
    });
  }
  return checkInFlight;
}

// Wires apiClient's generic server-wake hooks up to this store. Done
// here (not in apiClient.ts) so core/ stays feature-agnostic — same
// pattern as authStore's `configureAuthSession` wiring.
configureDynamicBaseUrl(() => {
  const { wakeState } = useServerWakeStore.getState();
  return wakeState.status === 'running' ? wakeState.baseUrl : null;
});

configureServerWakeRecovery({
  recoverFromNetworkError: async () => {
    const state = await runWakeCheck();
    return state.status === 'running';
  },
});
