import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../../core/theme';
import { remainingLikes, type LikeQuota } from '../api/likes.api';

export type QuotaIndicatorProps = {
  quota: LikeQuota;
};

/**
 * Compact "N likes left today" readout. Purely presentational — intended
 * to sit at the top of the Discovery screen so the daily quota is visible
 * while swiping, without needing a trip to the dedicated Likes screen.
 */
export function QuotaIndicator({ quota }: QuotaIndicatorProps) {
  const remaining = remainingLikes(quota);

  return (
    <View style={styles.row}>
      <Text style={styles.text}>
        {remaining} like{remaining === 1 ? '' : 's'} left today
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  text: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
