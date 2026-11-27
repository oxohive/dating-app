import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '../../../core/apiErrorMessage';
import { confirmSelfieUpload, presignSelfieUpload, uploadSelfieToPresignedUrl } from '../api/verification.api';
import { VERIFICATION_QUERY_KEY } from './useVerificationStatus';

const DEFAULT_CONTENT_TYPE = 'image/jpeg';

/**
 * Drives the selfie-capture-and-submit flow: open the camera (front-facing,
 * matching a selfie), get a presigned upload URL, PUT the bytes directly to
 * storage, then confirm the upload with the backend. Mirrors
 * `usePhotoUpload` in the profile feature (same presign/PUT/confirm
 * pipeline shape), swapping the photo library picker for the camera since
 * this needs a live selfie, not a gallery pick.
 */
export function useSelfieCapture() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Camera permission was not granted.');
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        cameraType: ImagePicker.CameraType.front,
        quality: 0.8,
      });

      if (result.canceled) {
        return null;
      }

      const asset = result.assets[0];
      if (!asset) {
        return null;
      }

      const contentType = asset.mimeType ?? DEFAULT_CONTENT_TYPE;
      const { uploadUrl, s3Key } = await presignSelfieUpload(contentType);
      await uploadSelfieToPresignedUrl(uploadUrl, asset.uri, contentType);
      return confirmSelfieUpload(s3Key);
    },
    onSuccess: (state) => {
      if (state) {
        queryClient.invalidateQueries({ queryKey: VERIFICATION_QUERY_KEY });
      }
    },
  });

  return {
    captureSelfie: () => mutation.mutate(),
    isSubmitting: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not submit that selfie. Please try again.') : null,
  };
}
