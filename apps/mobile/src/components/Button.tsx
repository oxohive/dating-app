import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii, spacing, typography } from '../core/theme';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
};

/**
 * The single button primitive every feature should use. No feature screen
 * should define its own `<Pressable>` button — compose this instead.
 */
export function Button({ label, onPress, variant = 'primary', disabled = false }: ButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelSecondary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.5,
  },
  // Every Button instance was previously silent on press — no visual
  // acknowledgment that a tap registered while its action (OTP send,
  // like/pass, send message, ...) is in flight. This is the single
  // shared primitive, so fixing it here covers every screen at once.
  pressed: {
    opacity: 0.75,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
  },
  labelPrimary: {
    color: colors.onPrimary,
  },
  labelSecondary: {
    color: colors.text,
  },
});
