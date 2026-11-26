import { ActivityIndicator } from 'react-native';
import { Button } from '../../../components/Button';
import { colors } from '../../../core/theme';

export type AddPhotoButtonProps = {
  onPress: () => void;
  isUploading: boolean;
};

/**
 * Trigger for the pick-and-upload-a-photo flow. Shows a spinner instead
 * of the button while the upload pipeline is running, so a second
 * upload can't be fired mid-flight.
 */
export function AddPhotoButton({ onPress, isUploading }: AddPhotoButtonProps) {
  if (isUploading) {
    return <ActivityIndicator color={colors.primary} />;
  }

  return <Button label="Add photo" onPress={onPress} variant="secondary" />;
}
