import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../../components/Button';
import { colors, spacing, typography } from '../../../core/theme';
import { formatPhoneNumberInput, getPhoneNumberInputHint, isLikelyValidPhoneNumber } from '../validation';

export type LoginFormProps = {
  phoneNumber: string;
  onChangePhoneNumber: (value: string) => void;
  onSubmit: () => void;
  submitting?: boolean;
};

/**
 * Phone number capture step of login. Single responsibility: collect a
 * phone number and trigger OTP request. Formats the number as the user
 * types (`formatPhoneNumberInput`) and surfaces live validation feedback
 * (`getPhoneNumberInputHint`) instead of only a generic post-submit error.
 */
export function LoginForm({ phoneNumber, onChangePhoneNumber, onSubmit, submitting = false }: LoginFormProps) {
  const hint = getPhoneNumberInputHint(phoneNumber);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Phone number</Text>
      <TextInput
        accessibilityLabel="Phone number"
        keyboardType="phone-pad"
        onChangeText={(text) => onChangePhoneNumber(formatPhoneNumberInput(text))}
        placeholder="+91 90000 00000"
        style={styles.input}
        value={phoneNumber}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <Button disabled={submitting || !isLikelyValidPhoneNumber(phoneNumber)} label="Send OTP" onPress={onSubmit} />
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
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
