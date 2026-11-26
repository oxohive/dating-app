import { Image, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, radii, spacing, typography } from '../../../core/theme';

export type PhotoGalleryProps = {
  photoUrls: string[];
};

/**
 * Horizontal strip of profile photos. Renders an empty-state message
 * rather than a blank area when there are no photos yet.
 */
export function PhotoGallery({ photoUrls }: PhotoGalleryProps) {
  if (photoUrls.length === 0) {
    return <Text style={styles.empty}>No photos added yet.</Text>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {photoUrls.map((uri) => (
        <Image key={uri} source={{ uri }} style={styles.photo} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  photo: {
    width: 120,
    height: 160,
    borderRadius: radii.md,
    marginRight: spacing.sm,
  },
  empty: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
