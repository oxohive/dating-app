import { ActivityIndicator } from 'react-native';
import { Button } from '../../../components/Button';
import { colors } from '../../../core/theme';

export type SelfieCaptureButtonProps = {
  onPress: () => void;
  isSubmitting: boolean;
};

/**
 * Trigger for the capture-and-submit-a-selfie flow. Mirrors
 * `AddPhotoButton` in the profile feature: a spinner replaces the button
 * while the capture/upload pipeline is running.
 */
export function SelfieCaptureButton({ onPress, isSubmitting }: SelfieCaptureButtonProps) {
  if (isSubmitting) {
    return <ActivityIndicator color={colors.primary} />;
  }

  return <Button label="Take a selfie to verify" onPress={onPress} />;
}
