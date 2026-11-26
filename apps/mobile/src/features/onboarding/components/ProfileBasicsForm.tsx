import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, spacing, typography } from '../../../core/theme';

export type ProfileBasicsFormProps = {
  displayName: string;
  onChangeDisplayName: (value: string) => void;
  dateOfBirth: string;
  onChangeDateOfBirth: (value: string) => void;
};

/**
 * First onboarding step: name + date of birth. Single responsibility, no
 * navigation or submission logic here.
 */
export function ProfileBasicsForm({
  displayName,
  onChangeDisplayName,
  dateOfBirth,
  onChangeDateOfBirth,
}: ProfileBasicsFormProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>What should we call you?</Text>
      <TextInput
        accessibilityLabel="Display name"
        onChangeText={onChangeDisplayName}
        placeholder="Display name"
        style={styles.input}
        value={displayName}
      />
      <Text style={styles.label}>Date of birth</Text>
      <TextInput
        accessibilityLabel="Date of birth"
        keyboardType="numbers-and-punctuation"
        onChangeText={onChangeDateOfBirth}
        placeholder="YYYY-MM-DD"
        style={styles.input}
        value={dateOfBirth}
      />
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
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...typography.body,
  },
});
