import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../../core/theme';
import type { RelationshipIntention } from '../api/onboarding.api';
import { ChipOption } from './ChipOption';

export const RELATIONSHIP_INTENTION_OPTIONS: readonly { value: RelationshipIntention; label: string }[] = [
  { value: 'serious', label: 'Something serious' },
  { value: 'casual', label: 'Keeping it casual' },
  { value: 'open', label: 'Open to anything' },
  { value: 'figuring_out', label: 'Still figuring it out' },
];

export type RelationshipIntentionFormProps = {
  value: RelationshipIntention | null;
  onChange: (value: RelationshipIntention) => void;
};

/**
 * Single-select "what are you looking for" step. Single responsibility:
 * render the options and report the selection.
 */
export function RelationshipIntentionForm({ value, onChange }: RelationshipIntentionFormProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Looking for</Text>
      <View style={styles.options}>
        {RELATIONSHIP_INTENTION_OPTIONS.map((option) => (
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
