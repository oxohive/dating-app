import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../../core/theme';

/**
 * Visible "this is not a real payment" indicator. Shown on every checkout
 * surface this wave, per the plan's explicit instruction that there are no
 * real Razorpay keys yet — this must never look like a live payment flow.
 */
export function SandboxBadge() {
  return (
    <View style={styles.badge}>
      <Text style={styles.label}>SANDBOX — no real payment will be made</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryMuted,
    borderRadius: radii.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
});
