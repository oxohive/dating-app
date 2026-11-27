import { StyleSheet, Text, View } from 'react-native';

// Same dark palette as WakeUpScreen — see its comment for why this
// doesn't use the app's (light) `theme.ts` tokens.
const PALETTE = {
  background: '#120f16',
  card: '#1c1a21',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  brand: '#d4d1d8',
  title: '#ffffff',
  body: '#b9b4c0',
  errorIconBackground: 'rgba(243, 97, 7, 0.14)',
  forbiddenIconBackground: 'rgba(229, 29, 87, 0.12)',
};

type WakeErrorScreenProps = {
  variant: 'error' | 'forbidden';
  message?: string;
};

/**
 * Error-state screen for the server-wake gate (task 0018): shown when
 * the wake Lambda reports an unrecoverable backend error, or rejects
 * the request as forbidden (bad/missing shared secret). A clear,
 * distinct failure state instead of a silent hang or generic crash.
 */
export function WakeErrorScreen({ variant, message }: WakeErrorScreenProps) {
  const title = variant === 'forbidden' ? 'Access denied' : 'Something went wrong';
  const body =
    message ??
    (variant === 'forbidden'
      ? 'The app could not authenticate with the wake-up service. Please update the app or contact support.'
      : 'The server could not be started automatically. Please try again shortly.');

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.brand}>Dating App</Text>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: variant === 'forbidden' ? PALETTE.forbiddenIconBackground : PALETTE.errorIconBackground },
          ]}
        >
          <Text style={styles.icon}>!</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
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
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  icon: {
    color: PALETTE.title,
    fontWeight: '700',
    fontSize: 20,
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
  },
});
