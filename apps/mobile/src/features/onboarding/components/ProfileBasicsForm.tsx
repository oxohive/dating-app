import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, spacing, typography } from '../../../core/theme';

export type ProfileBasicsFormProps = {
  displayName: string;
  onChangeDisplayName: (value: string) => void;
  bio: string;
  onChangeBio: (value: string) => void;
};

/**
 * First onboarding step: name + short bio. Single responsibility, no
 * navigation or submission logic here.
 */
export function ProfileBasicsForm({ displayName, onChangeDisplayName, bio, onChangeBio }: ProfileBasicsFormProps) {
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
      <Text style={styles.label}>A line about you</Text>
      <TextInput
        accessibilityLabel="Bio"
        multiline
        onChangeText={onChangeBio}
        placeholder="Tell people a bit about yourself"
        style={[styles.input, styles.bio]}
        value={bio}
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
  bio: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
