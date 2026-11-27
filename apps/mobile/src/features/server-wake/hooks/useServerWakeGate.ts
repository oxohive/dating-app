import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { runWakeCheck, useServerWakeStore } from '../store/serverWakeStore';
import type { WakeState } from '../wakeState';

/**
 * Drives the server-wake check for the app-startup gate (task 0018):
 * runs it once on mount, and again every time the app returns to the
 * foreground after being backgrounded (the pilot instance may have gone
 * idle-stopped while the app was in the background). Returns the current
 * {@link WakeState} for the gate component to render.
 */
export function useServerWakeGate(): WakeState {
  const wakeState = useServerWakeStore((state) => state.wakeState);
  const previousAppState = useRef<AppStateStatus>((AppState.currentState ?? 'active') as AppStateStatus);

  useEffect(() => {
    runWakeCheck();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const wasBackgrounded = previousAppState.current === 'background' || previousAppState.current === 'inactive';
      if (wasBackgrounded && nextAppState === 'active') {
        runWakeCheck();
      }
      previousAppState.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  return wakeState;
}
