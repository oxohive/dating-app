import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/Button';
import { colors, radii, spacing, typography } from '../../../core/theme';
import { describeIncomingLikesTeaser } from '../api/likes.api';

export type IncomingLikesLockedBannerProps = {
  count: number;
  onPressUpsell: () => void;
};

/**
 * Free-tier teaser state for "see who liked you": a count, no identities,
 * linking to the Wave-2 subscription upsell screens. Deliberately mirrors
 * the locked-state markup `RadiusPicker` already established
 * (`features/discovery/components/RadiusPicker.tsx`) — same upsell-block
 * shape/copy style — rather than inventing a new locked-state pattern, per
 * the task brief.
 */
export function IncomingLikesLockedBanner({ count, onPressUpsell }: IncomingLikesLockedBannerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{describeIncomingLikesTeaser(count)}</Text>
      {count > 0 ? <Button label="Unlock with Premium" onPress={onPressUpsell} variant="secondary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    ...typography.body,
    color: colors.text,
  },
});
