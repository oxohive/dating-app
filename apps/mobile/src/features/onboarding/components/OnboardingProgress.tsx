import { StyleSheet, Text } from 'react-native';
import { colors, typography } from '../../../core/theme';

export type OnboardingProgressProps = {
  currentStep: number;
  totalSteps: number;
};

/** Tiny "Step X of Y" indicator shown above the active wizard step. */
export function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  return (
    <Text style={styles.text}>
      Step {currentStep} of {totalSteps}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
