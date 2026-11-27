import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../core/theme';
import { useServerWakeGate } from '../hooks/useServerWakeGate';
import { runWakeCheck } from '../store/serverWakeStore';
import { WakeErrorScreen } from './WakeErrorScreen';
import { WakeUpScreen } from './WakeUpScreen';

type ServerWakeGateProps = {
  children: ReactNode;
};

/**
 * App-startup gate (task 0018): runs the server-wake check before
 * rendering `children` (the main navigator), and again whenever the app
 * returns to the foreground. Renders a "waking up" screen while the
 * backend instance is starting, and a clear error screen with a manual
 * retry if it can't be recovered — `children` only mount once the
 * backend is confirmed `running`.
 *
 * This also covers the mid-session recovery path transparently: a
 * network error from any API call re-triggers the same shared
 * `runWakeCheck()` loop (wired in `core/apiClient.ts` via
 * `configureServerWakeRecovery`), which updates the same store this gate
 * reads — so if a call fails because the instance went idle-stopped
 * again, this screen reappears automatically until it's back.
 */
export function ServerWakeGate({ children }: ServerWakeGateProps) {
  const wakeState = useServerWakeGate();

  if (wakeState.status === 'running') {
    return <>{children}</>;
  }

  if (wakeState.status === 'starting') {
    return <WakeUpScreen retryAfterSeconds={wakeState.retryAfterSeconds} />;
  }

  if (wakeState.status === 'error' || wakeState.status === 'forbidden') {
    return (
      <View style={styles.errorWrapper}>
        <WakeErrorScreen
          message={wakeState.status === 'error' ? wakeState.message : undefined}
          variant={wakeState.status}
        />
        <Pressable
          accessibilityLabel="Try again"
          accessibilityRole="button"
          onPress={() => runWakeCheck()}
          style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  // 'checking' — the initial state, before the first check resolves.
  return <WakeUpScreen />;
}

const styles = StyleSheet.create({
  errorWrapper: {
    flex: 1,
  },
  retryButton: {
    position: 'absolute',
    bottom: 56,
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryButtonPressed: {
    opacity: 0.75,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
