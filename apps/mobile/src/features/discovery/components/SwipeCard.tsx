import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../../components/Avatar';
import { Card } from '../../../components/Card';
import { colors, spacing, typography } from '../../../core/theme';
import type { DiscoveryCandidateDto } from '../api/discovery.api';

export type SwipeCardProps = {
  candidate: DiscoveryCandidateDto;
};

/**
 * Single candidate card shown at the top of the swipe deck. Purely
 * presentational — swipe gestures live in SwipeDeck.
 */
export function SwipeCard({ candidate }: SwipeCardProps) {
  return (
    <Card>
      <View style={styles.content}>
        <Avatar initials={candidate.displayName.charAt(0).toUpperCase()} size={96} uri={candidate.photoUrl} />
        <Text style={styles.name}>
          {candidate.displayName}, {candidate.age}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  name: {
    ...typography.subtitle,
    color: colors.text,
  },
});
