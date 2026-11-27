import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import type { RootNavigationProp } from '../../../app/navigation/RootNavigator';
import { ErrorText } from '../../../components/ErrorText';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { spacing, typography } from '../../../core/theme';
import { SelfieCaptureButton } from '../components/SelfieCaptureButton';
import { useSelfieCapture } from '../hooks/useSelfieCapture';

/**
 * Selfie capture screen: thin composition only. Capture/upload/confirm
 * state lives in `useSelfieCapture`; on a successful submission it moves
 * on to the status screen.
 */
export function SelfieCaptureScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const { captureSelfie, isSubmitting, error } = useSelfieCapture();

  async function handlePress() {
    await captureSelfie();
    navigation.replace('VerificationStatus');
  }

  return (
    <ScreenContainer>
      <View style={styles.section}>
        <Text style={styles.title}>Verify your profile</Text>
        <Text style={styles.body}>
          Take a quick selfie so we can confirm it&apos;s really you. This helps keep everyone on the platform safe.
        </Text>
        {error ? <ErrorText message={error} /> : null}
        <SelfieCaptureButton isSubmitting={isSubmitting} onPress={handlePress} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  title: {
    ...typography.title,
  },
  body: {
    ...typography.body,
  },
});
