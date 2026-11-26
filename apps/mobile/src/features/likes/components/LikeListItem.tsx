import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../../components/Avatar';
import { colors, spacing, typography } from '../../../core/theme';
import type { LikeDto } from '../api/likes.api';

export type LikeListItemProps = {
  like: LikeDto;
};

/**
 * Single row in the "who liked me" list. Purely presentational.
 */
export function LikeListItem({ like }: LikeListItemProps) {
  return (
    <View style={styles.row}>
      <Avatar initials={like.displayName.charAt(0).toUpperCase()} uri={like.photoUrl} />
      <Text style={styles.name}>{like.displayName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  name: {
    ...typography.body,
    color: colors.text,
  },
});
