import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii, spacing, typography } from '../../../core/theme';

export type ChipOptionProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

/**
 * Single selectable chip/pill. Shared by the gender, orientation and
 * relationship-intention steps so each of those forms only has to
 * describe its own options, not re-style a Pressable.
 */
export function ChipOption({ label, selected, onPress }: ChipOptionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  selected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  label: {
    ...typography.body,
    color: colors.text,
  },
  selectedLabel: {
    color: colors.primary,
    fontWeight: '600',
  },
});
