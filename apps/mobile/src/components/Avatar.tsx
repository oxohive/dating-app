import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, radii, typography } from '../core/theme';

export type AvatarProps = {
  uri?: string;
  initials: string;
  size?: number;
};

/**
 * Shared circular avatar used anywhere a user's photo appears (profile,
 * matches, messaging). Falls back to initials when there is no photo.
 */
export function Avatar({ uri, initials, size = 48 }: AvatarProps) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image accessibilityIgnoresInvertColors source={{ uri }} style={dimension} />;
  }

  return (
    <View style={[styles.fallback, dimension]}>
      <Text style={styles.initials}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  initials: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
});
