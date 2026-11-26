import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, spacing, typography } from '../../../core/theme';

export type ProfileTextFieldsFormProps = {
  displayName: string;
  onChangeDisplayName: (value: string) => void;
  bio: string;
  onChangeBio: (value: string) => void;
  city: string;
  onChangeCity: (value: string) => void;
  locality: string;
  onChangeLocality: (value: string) => void;
  interests: string;
  onChangeInterests: (value: string) => void;
};

/**
 * The free-text fields of the profile edit form (name, bio, location,
 * interests). The selectable fields (gender, orientation, relationship
 * intention) are their own form components, shared with onboarding.
 */
export function ProfileTextFieldsForm({
  displayName,
  onChangeDisplayName,
  bio,
  onChangeBio,
  city,
  onChangeCity,
  locality,
  onChangeLocality,
  interests,
  onChangeInterests,
}: ProfileTextFieldsFormProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Display name</Text>
      <TextInput accessibilityLabel="Display name" onChangeText={onChangeDisplayName} style={styles.input} value={displayName} />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        accessibilityLabel="Bio"
        multiline
        onChangeText={onChangeBio}
        style={[styles.input, styles.bio]}
        value={bio}
      />

      <Text style={styles.label}>City</Text>
      <TextInput accessibilityLabel="City" onChangeText={onChangeCity} style={styles.input} value={city} />

      <Text style={styles.label}>Locality</Text>
      <TextInput accessibilityLabel="Locality" onChangeText={onChangeLocality} style={styles.input} value={locality} />

      <Text style={styles.label}>Interests (comma separated)</Text>
      <TextInput accessibilityLabel="Interests" onChangeText={onChangeInterests} style={styles.input} value={interests} />
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
