import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/Button';
import { colors, radii, spacing, typography } from '../../../core/theme';

export type MatchCelebrationProps = {
  visible: boolean;
  matchedDisplayName: string;
  onDismiss: () => void;
  onViewMatch: () => void;
};

/**
 * "It's a match!" overlay shown when a swipe-right's `POST /likes` comes
 * back with `matched: true`. Rendered as a modal over the Discovery screen
 * rather than a navigated route, since RootNavigator's route list is a
 * shared file this subtask doesn't add new routes to.
 */
export function MatchCelebration({ visible, matchedDisplayName, onDismiss, onViewMatch }: MatchCelebrationProps) {
  return (
    <Modal animationType="fade" onRequestClose={onDismiss} transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>It&apos;s a match!</Text>
          <Text style={styles.subtitle}>You and {matchedDisplayName} liked each other.</Text>
          <View style={styles.actions}>
            <Button label="Keep swiping" onPress={onDismiss} variant="secondary" />
            <Button label="View match" onPress={onViewMatch} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  card: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.primary,
  },
  subtitle: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
