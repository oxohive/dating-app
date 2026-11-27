import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../core/theme';

// This screen intentionally uses its own dark palette rather than the
// app's (light) `theme.ts` tokens, to match the web wake-up page's
// (task 0017) dark/coral visual language — only the brand accent color
// is shared with the rest of the app via `theme.colors.primary`.
const PALETTE = {
  background: '#120f16',
  card: '#1c1a21',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  track: 'rgba(255, 255, 255, 0.08)',
  brand: '#d4d1d8',
  title: '#ffffff',
  body: '#b9b4c0',
  hint: '#8d8796',
};

type WakeUpScreenProps = {
  retryAfterSeconds?: number;
};

/**
 * App-startup/mid-session "waking up" screen (task 0018), shown while
 * the pilot backend instance is being started by the env-wake Lambda.
 * Adapts the dark-background/coral-accent/spinner/progress-indicator
 * visual language of the web wake-up page (task 0017) to React Native
 * components rather than reusing its literal HTML/CSS.
 */
export function WakeUpScreen({ retryAfterSeconds }: WakeUpScreenProps) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: false,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [progress]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: ['-40%', '140%'] });

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.brand}>Dating App</Text>
        <ActivityIndicator color={colors.primary} size="large" style={styles.spinner} />
        <Text style={styles.title}>Starting the app</Text>
        <Text style={styles.body}>
          The server was idle and is starting back up. This page checks automatically — no action needed.
        </Text>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { transform: [{ translateX }] }]} />
        </View>
        <Text style={styles.hint}>
          {retryAfterSeconds
            ? `Usually ready within about a minute. Checking again in ${retryAfterSeconds}s…`
            : 'Usually ready within about a minute. Checking…'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.background,
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: PALETTE.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PALETTE.cardBorder,
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  brand: {
    color: PALETTE.brand,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 24,
    letterSpacing: 0.2,
  },
  spinner: {
    marginBottom: 16,
  },
  title: {
    color: PALETTE.title,
    fontWeight: '700',
    fontSize: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  body: {
    color: PALETTE.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  track: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    backgroundColor: PALETTE.track,
    overflow: 'hidden',
    marginBottom: 14,
  },
  fill: {
    width: '35%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  hint: {
    color: PALETTE.hint,
    fontSize: 12,
    textAlign: 'center',
  },
});
