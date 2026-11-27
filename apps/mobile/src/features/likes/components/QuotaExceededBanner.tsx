import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii, spacing, typography } from '../../../core/theme';

export type QuotaExceededBannerProps = {
  /** ISO-8601 timestamp of when the daily quota resets. */
  resetsAt: string;
  /** Omit to render a static (non-dismissible) banner. */
  onDismiss?: () => void;
};

/**
 * Clear, explicit state for the 403 `quota_exceeded` response from
 * `POST /likes` — shown instead of a generic error so the user understands
 * why swiping right stopped working.
 */
export function QuotaExceededBanner({ resetsAt, onDismiss }: QuotaExceededBannerProps) {
  const resetsAtLabel = new Date(resetsAt).toLocaleString();

  return (
    <Pressable
      accessibilityLabel={onDismiss ? 'Dismiss: you have used today\'s likes' : undefined}
      accessibilityRole={onDismiss ? 'button' : undefined}
      disabled={!onDismiss}
      onPress={onDismiss}
      style={({ pressed }) => [styles.banner, pressed && onDismiss && styles.bannerPressed]}
    >
      <Text style={styles.title}>You&apos;ve used today&apos;s likes</Text>
      <Text style={styles.body}>Check back after {resetsAtLabel} for more.</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerPressed: {
    opacity: 0.75,
  },
  title: {
    ...typography.subtitle,
    color: colors.primary,
  },
  body: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.xs,
  },
});
