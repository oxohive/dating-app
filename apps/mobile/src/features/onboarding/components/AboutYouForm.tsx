import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, spacing, typography } from '../../../core/theme';

export type AboutYouFormProps = {
  bio: string;
  onChangeBio: (value: string) => void;
  interests: string;
  onChangeInterests: (value: string) => void;
};

/**
 * Final, optional step: bio + interests. Both fields are optional per
 * the product plan, so this screen never blocks "Finish" — it's just a
 * chance to add a bit more before landing in the app.
 */
export function AboutYouForm({ bio, onChangeBio, interests, onChangeInterests }: AboutYouFormProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.caption}>Both of these are optional — you can always add them later.</Text>
      <Text style={styles.label}>A line about you</Text>
      <TextInput
        accessibilityLabel="Bio"
        multiline
        onChangeText={onChangeBio}
        placeholder="Tell people a bit about yourself"
        style={[styles.input, styles.bio]}
        value={bio}
      />
      <Text style={styles.label}>Interests (comma separated)</Text>
      <TextInput
        accessibilityLabel="Interests"
        onChangeText={onChangeInterests}
        placeholder="hiking, jazz, cooking"
        style={styles.input}
        value={interests}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  caption: {
    ...typography.caption,
    color: colors.textMuted,
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
