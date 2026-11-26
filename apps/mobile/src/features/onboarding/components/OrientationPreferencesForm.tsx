import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../../core/theme';
import { ChipOption } from './ChipOption';

export const ORIENTATION_OPTIONS = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'everyone', label: 'Everyone' },
] as const;

export type OrientationPreferencesFormProps = {
  value: string[];
  onToggle: (value: string) => void;
};

/**
 * Multi-select "who are you interested in" step. Single responsibility:
 * render the options and report toggles; the set of selected values is
 * owned by the caller.
 */
export function OrientationPreferencesForm({ value, onToggle }: OrientationPreferencesFormProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Show me</Text>
      <View style={styles.options}>
        {ORIENTATION_OPTIONS.map((option) => (
          <ChipOption
            key={option.value}
            label={option.label}
            onPress={() => onToggle(option.value)}
            selected={value.includes(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
