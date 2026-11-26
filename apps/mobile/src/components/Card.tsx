import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../core/theme';

/**
 * Generic elevated surface. Feature cards (ProfileCard, MatchCard, ...)
 * should wrap their content in this rather than re-declaring the same
 * border/shadow/padding styles.
 */
export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
});
