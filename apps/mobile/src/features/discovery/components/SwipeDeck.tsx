import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/Button';
import { colors, spacing, typography } from '../../../core/theme';
import type { DiscoveryCandidateDto, SwipeDirection } from '../api/discovery.api';
import { SwipeCard } from './SwipeCard';

export type SwipeDeckProps = {
  candidates: DiscoveryCandidateDto[];
  onSwipe: (candidateId: string, direction: SwipeDirection) => void;
};

/**
 * Renders the top candidate of the deck plus like/pass controls. Full
 * gesture-driven swiping is a future enhancement — for the MVP skeleton
 * this exposes the same action via buttons so the flow is testable.
 */
export function SwipeDeck({ candidates, onSwipe }: SwipeDeckProps) {
  const current = candidates[0];

  if (!current) {
    return <Text style={styles.empty}>No more profiles right now. Check back later.</Text>;
  }

  return (
    <View style={styles.container}>
      <SwipeCard candidate={current} />
      <View style={styles.actions}>
        <Button label="Pass" onPress={() => onSwipe(current.id, 'pass')} variant="secondary" />
        <Button label="Like" onPress={() => onSwipe(current.id, 'like')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
