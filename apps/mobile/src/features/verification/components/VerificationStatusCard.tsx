import { StyleSheet, Text, View } from 'react-native';
import { Card } from '../../../components/Card';
import { spacing, typography } from '../../../core/theme';
import type { VerificationState } from '../api/verification.api';
import { describeVerificationStatus } from '../describeVerificationStatus';

export type VerificationStatusCardProps = {
  state: VerificationState;
};

/** Status label + explanatory message for the verification status screen. */
export function VerificationStatusCard({ state }: VerificationStatusCardProps) {
  const display = describeVerificationStatus(state.status);

  return (
    <Card>
      <View style={styles.section}>
        <Text style={[styles.label, { color: display.color }]}>{display.label}</Text>
        <Text style={styles.message}>{display.message}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.xs,
  },
  label: {
    ...typography.subtitle,
    fontWeight: '700',
  },
  message: {
    ...typography.body,
  },
});
