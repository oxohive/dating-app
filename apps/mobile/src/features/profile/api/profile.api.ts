import { apiClient } from '../../../core/apiClient';
import type { RelationshipIntention } from '../../onboarding/api/onboarding.api';

export type ProfilePhotoDto = {
  id: string;
  url: string;
  position: number;
  isPrimary: boolean;
};

export type ProfileDto = {
  id: string;
  displayName: string;
  gender: string;
  orientationPreferences: string[];
  relationshipIntention: RelationshipIntention;
  bio: string | null;
  interests: string[] | null;
  city: string;
  locality: string;
  photos: ProfilePhotoDto[];
};

export type UpdateProfileInput = Partial<{
  displayName: string;
  gender: string;
  orientationPreferences: string[];
  relationshipIntention: RelationshipIntention;
  bio: string;
  interests: string[];
  city: string;
  locality: string;
}>;

// Wire-format (snake_case) shapes, as the backend actually returns them.
type ProfilePhotoApiResponse = {
  id: string;
  url: string;
  position: number;
  is_primary: boolean;
};

type ProfileApiResponse = {
  id: string;
  display_name: string;
  gender: string;
  orientation_preferences: string[];
  relationship_intention: string;
  bio: string | null;
  interests: string[] | null;
  city: string;
  locality: string;
  photos?: ProfilePhotoApiResponse[];
};

function toProfileDto(response: ProfileApiResponse): ProfileDto {
  return {
    id: response.id,
    displayName: response.display_name,
    gender: response.gender,
    orientationPreferences: response.orientation_preferences,
    relationshipIntention: response.relationship_intention as RelationshipIntention,
    bio: response.bio,
    interests: response.interests,
    city: response.city,
    locality: response.locality,
    photos: (response.photos ?? []).map((photo) => ({
      id: photo.id,
      url: photo.url,
      position: photo.position,
      isPrimary: photo.is_primary,
    })),
  };
}

/** `GET /profiles/me` — the signed-in user's own profile. */
export async function fetchMyProfile(): Promise<ProfileDto> {
  const response = await apiClient.get<ProfileApiResponse>('/profiles/me');
  return toProfileDto(response);
}

/** `PATCH /profiles/me` — partial update; only changed fields need to be sent. */
export async function updateMyProfile(input: UpdateProfileInput): Promise<ProfileDto> {
  const payload: Record<string, unknown> = {};
  if (input.displayName !== undefined) payload.display_name = input.displayName;
  if (input.gender !== undefined) payload.gender = input.gender;
  if (input.orientationPreferences !== undefined) payload.orientation_preferences = input.orientationPreferences;
  if (input.relationshipIntention !== undefined) payload.relationship_intention = input.relationshipIntention;
  if (input.bio !== undefined) payload.bio = input.bio;
  if (input.interests !== undefined) payload.interests = input.interests;
  if (input.city !== undefined) payload.city = input.city;
  if (input.locality !== undefined) payload.locality = input.locality;

  const response = await apiClient.patch<ProfileApiResponse>('/profiles/me', payload);
  return toProfileDto(response);
}

export type PresignPhotoUploadResult = {
  uploadUrl: string;
  s3Key: string;
};

/** `POST /profiles/me/photos/presign` — get a presigned S3 PUT URL. */
export async function presignProfilePhotoUpload(contentType: string): Promise<PresignPhotoUploadResult> {
  const response = await apiClient.post<{ upload_url: string; s3_key: string }>('/profiles/me/photos/presign', {
    content_type: contentType,
  });

  return { uploadUrl: response.upload_url, s3Key: response.s3_key };
}

/**
 * PUTs the image bytes directly to the presigned S3 URL. Deliberately
 * bypasses apiClient: this request goes to S3, not our backend, and must
 * not carry our Authorization/correlation headers or JSON content-type.
 */
export async function uploadPhotoToPresignedUrl(uploadUrl: string, fileUri: string, contentType: string): Promise<void> {
  const fileResponse = await fetch(fileUri);
  const blob = await fileResponse.blob();

  const putResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });

  if (!putResponse.ok) {
    throw new Error(`Photo upload to storage failed with status ${putResponse.status}`);
  }
}

/** `POST /profiles/me/photos/confirm` — tells the backend the S3 upload succeeded. */
export async function confirmProfilePhoto(s3Key: string, position: number): Promise<void> {
  await apiClient.post<void>('/profiles/me/photos/confirm', { s3_key: s3Key, position });
}
