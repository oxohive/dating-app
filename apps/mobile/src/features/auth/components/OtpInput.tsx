import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../../components/Button';
import { colors, spacing, typography } from '../../../core/theme';

export type OtpInputProps = {
  code: string;
  onChangeCode: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
};

/**
 * OTP code capture step of login. Single responsibility: collect the
 * verification code and trigger verification.
 */
export function OtpInput({ code, onChangeCode, onSubmit, disabled = false }: OtpInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Verification code</Text>
      <TextInput
        accessibilityLabel="OTP code"
        keyboardType="number-pad"
        maxLength={6}
        onChangeText={onChangeCode}
        placeholder="------"
        style={styles.input}
        value={code}
      />
      <Button disabled={disabled || code.length === 0} label="Verify" onPress={onSubmit} />
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
    letterSpacing: 4,
    ...typography.body,
  },
});
