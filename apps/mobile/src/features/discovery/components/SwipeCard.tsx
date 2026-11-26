import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../../components/Avatar';
import { Card } from '../../../components/Card';
import { colors, spacing, typography } from '../../../core/theme';
import type { DiscoveryProfile } from '../api/discovery.api';

export type SwipeCardProps = {
  candidate: DiscoveryProfile;
};

/**
 * Single candidate card shown at the top of the swipe deck. Purely
 * presentational — swipe gestures live in SwipeDeck.
 */
export function SwipeCard({ candidate }: SwipeCardProps) {
  return (
    <Card>
      <View style={styles.content}>
        <Avatar initials={candidate.display_name.charAt(0).toUpperCase()} size={96} uri={candidate.photo_urls[0]} />
        <Text style={styles.name}>
          {candidate.display_name}, {candidate.age}
        </Text>
        {candidate.bio ? <Text style={styles.bio}>{candidate.bio}</Text> : null}
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
  bio: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
