import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, spacing, typography } from '../../../core/theme';

export type LocationFormProps = {
  city: string;
  onChangeCity: (value: string) => void;
  locality: string;
  onChangeLocality: (value: string) => void;
};

/**
 * City + locality step. Matching is same-city only for this MVP wave, so
 * these two fields are required (no radius/GPS yet).
 */
export function LocationForm({ city, onChangeCity, locality, onChangeLocality }: LocationFormProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>City</Text>
      <TextInput
        accessibilityLabel="City"
        onChangeText={onChangeCity}
        placeholder="Mumbai"
        style={styles.input}
        value={city}
      />
      <Text style={styles.label}>Locality</Text>
      <TextInput
        accessibilityLabel="Locality"
        onChangeText={onChangeLocality}
        placeholder="Bandra"
        style={styles.input}
        value={locality}
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
