import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../../core/theme';
import { ChipOption } from './ChipOption';

export const GENDER_OPTIONS = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

export type GenderFormProps = {
  value: string | null;
  onChange: (value: string) => void;
};

/**
 * Single-select gender step. Single responsibility: render the gender
 * options and report the selection.
 */
export function GenderForm({ value, onChange }: GenderFormProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>I am a</Text>
      <View style={styles.options}>
        {GENDER_OPTIONS.map((option) => (
          <ChipOption
            key={option.value}
            label={option.label}
            onPress={() => onChange(option.value)}
            selected={value === option.value}
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
