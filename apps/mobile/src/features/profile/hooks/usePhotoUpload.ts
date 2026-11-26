import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '../../../core/apiErrorMessage';
import { confirmProfilePhoto, presignProfilePhotoUpload, uploadPhotoToPresignedUrl } from '../api/profile.api';
import { PROFILE_QUERY_KEY } from './useProfile';

const DEFAULT_CONTENT_TYPE = 'image/jpeg';

/**
 * Drives the add-a-photo flow: pick an image from the library, get a
 * presigned upload URL, PUT the bytes directly to storage, then confirm
 * the upload with the backend. Kept separate from useProfile/
 * useUpdateProfile so this multi-step async pipeline's state doesn't
 * bloat either of those hooks.
 */
export function usePhotoUpload(nextPosition: number) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Photo library permission was not granted.');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
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
      const { uploadUrl, s3Key } = await presignProfilePhotoUpload(contentType);
      await uploadPhotoToPresignedUrl(uploadUrl, asset.uri, contentType);
      await confirmProfilePhoto(s3Key, nextPosition);
      return s3Key;
    },
    onSuccess: (s3Key) => {
      if (s3Key) {
        queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      }
    },
  });

  return {
    addPhoto: () => mutation.mutate(),
    isUploading: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not upload that photo. Please try again.') : null,
  };
}
