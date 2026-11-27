import { StyleSheet, Text, View } from 'react-native';
import { ProfileCard } from '../../profile/components/ProfileCard';
import { colors, spacing, typography } from '../../../core/theme';
import type { IncomingLiker } from '../api/likes.api';

export type IncomingLikeCardProps = {
  liker: IncomingLiker;
};

/**
 * One row in the (Premium) incoming-likes list: the liker's profile
 * summary plus when they liked you. Reuses the existing `ProfileCard`
 * (`features/profile/components/ProfileCard.tsx`) for the summary itself
 * rather than building a new profile-card component, per the task brief —
 * this file only adds the "liked you <when>" caption around it.
 */
export function IncomingLikeCard({ liker }: IncomingLikeCardProps) {
  const likedAtLabel = new Date(liker.likedAt).toLocaleDateString();

  return (
    <View style={styles.wrapper}>
      <ProfileCard avatarUri={liker.profile.photoUrl ?? undefined} bio="" displayName={liker.profile.displayName} />
      <Text style={styles.caption}>Liked you on {likedAtLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.sm,
  },
  caption: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
