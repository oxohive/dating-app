import { StyleSheet, Text } from 'react-native';
import { colors, typography } from '../core/theme';

export type ErrorTextProps = {
  message: string;
};

/**
 * Standard inline error message shown beneath a form when a submission
 * fails. Centralized here so every feature renders API/validation
 * errors the same way instead of each screen styling its own.
 */
export function ErrorText({ message }: ErrorTextProps) {
  return <Text style={styles.text}>{message}</Text>;
}

const styles = StyleSheet.create({
  text: {
    ...typography.caption,
    color: colors.danger,
  },
});
