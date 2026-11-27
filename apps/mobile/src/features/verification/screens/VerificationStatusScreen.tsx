import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import type { RootNavigationProp } from '../../../app/navigation/RootNavigator';
import { Button } from '../../../components/Button';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { spacing, typography } from '../../../core/theme';
import { VerificationStatusCard } from '../components/VerificationStatusCard';
import { useVerificationStatus } from '../hooks/useVerificationStatus';

/**
 * Verification status screen: shows pending/approved/rejected via
 * `VerificationStatusCard`, or an entry point into the capture flow when
 * nothing has been submitted yet (or the last submission was rejected).
 */
export function VerificationStatusScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const { data: state, isLoading } = useVerificationStatus();

  if (isLoading) {
    return (
      <ScreenContainer>
        <Text>Loading verification status...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.section}>
        {state ? <VerificationStatusCard state={state} /> : <Text style={styles.body}>You haven&apos;t submitted a verification selfie yet.</Text>}
        {!state || state.status === 'rejected' ? (
          <Button label="Take a selfie" onPress={() => navigation.navigate('SelfieCapture')} />
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  body: {
    ...typography.body,
  },
});
