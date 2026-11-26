import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../../components/Button';
import { colors, spacing, typography } from '../../../core/theme';
import { isLikelyValidPhoneNumber } from '../validation';

export type LoginFormProps = {
  phoneNumber: string;
  onChangePhoneNumber: (value: string) => void;
  onSubmit: () => void;
  submitting?: boolean;
};

/**
 * Phone number capture step of login. Single responsibility: collect a
 * phone number and trigger OTP request.
 */
export function LoginForm({ phoneNumber, onChangePhoneNumber, onSubmit, submitting = false }: LoginFormProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Phone number</Text>
      <TextInput
        accessibilityLabel="Phone number"
        keyboardType="phone-pad"
        onChangeText={onChangePhoneNumber}
        placeholder="+91 90000 00000"
        style={styles.input}
        value={phoneNumber}
      />
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
});
