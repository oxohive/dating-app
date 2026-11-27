import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../../core/theme';
import type { ReportReason } from '../api/safety.api';

export type ReportReasonPickerProps = {
  value: ReportReason;
  onChange: (reason: ReportReason) => void;
};

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'fake_profile', label: 'Fake profile' },
  { value: 'other', label: 'Other' },
];

/**
 * Single-select chips for the report reason. Single responsibility:
 * choosing one of the backend's documented `reason` values.
 */
export function ReportReasonPicker({ value, onChange }: ReportReasonPickerProps) {
  return (
    <View style={styles.row}>
      {REASONS.map((reason) => {
        const isSelected = reason.value === value;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={reason.value}
            onPress={() => onChange(reason.value)}
            style={[styles.chip, isSelected && styles.chipSelected]}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>{reason.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    ...typography.caption,
    color: colors.text,
  },
  labelSelected: {
    color: colors.onPrimary,
  },
});
