import { ApiError, apiClient } from '../../../core/apiClient';

/**
 * Wave 2, subtask M3 — built against `tasks/0010-wave2-deferred-features/plan.md`
 * before B6 (backend verification) necessarily landed. Endpoint paths/shapes
 * are assumed to mirror the existing profile-photo presign/confirm flow
 * (`features/profile/api/profile.api.ts`), since the plan explicitly says
 * verification selfie upload uses "the same S3 pattern as profile photos":
 *  - `POST /verification/selfie/presign` — assumed `{ content_type }` body,
 *    returns `{ upload_url, s3_key }` (same shape as the profile-photo presign).
 *  - `POST /verification/selfie/confirm` — assumed `{ s3_key }` body.
 *  - `GET /verification/me` — assumed to 404 before any selfie has ever
 *    been submitted (handled as `null` below), otherwise returns the
 *    verification row's status/timestamps.
 * Reconcile these against whatever B6 actually ships.
 */

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export type VerificationState = {
  status: VerificationStatus;
  createdAt: string;
  reviewedAt: string | null;
};

type VerificationStateApiResponse = {
  status: VerificationStatus;
  created_at: string;
  reviewed_at: string | null;
};

export type PresignSelfieUploadResult = {
  uploadUrl: string;
  s3Key: string;
};

/** `POST /verification/selfie/presign` — get a presigned S3 PUT URL for the selfie. */
export async function presignSelfieUpload(contentType: string): Promise<PresignSelfieUploadResult> {
  const response = await apiClient.post<{ upload_url: string; s3_key: string }>('/verification/selfie/presign', {
    content_type: contentType,
  });

  return { uploadUrl: response.upload_url, s3Key: response.s3_key };
}

/**
 * PUTs the image bytes directly to the presigned S3 URL. Deliberately
 * bypasses `apiClient` — this goes straight to S3, not our backend (same
 * reasoning as `uploadPhotoToPresignedUrl` in the profile feature).
 */
export async function uploadSelfieToPresignedUrl(uploadUrl: string, fileUri: string, contentType: string): Promise<void> {
  const fileResponse = await fetch(fileUri);
  const blob = await fileResponse.blob();

  const putResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });

  if (!putResponse.ok) {
    throw new Error(`Selfie upload to storage failed with status ${putResponse.status}`);
  }
}

/** `POST /verification/selfie/confirm` — tells the backend the S3 upload succeeded. */
export async function confirmSelfieUpload(s3Key: string): Promise<VerificationState> {
  const response = await apiClient.post<VerificationStateApiResponse>('/verification/selfie/confirm', { s3_key: s3Key });
  return {
    status: response.status,
    createdAt: response.created_at,
    reviewedAt: response.reviewed_at,
  };
}

/** `GET /verification/me` — current verification status, or `null` if nothing was ever submitted. */
export async function fetchMyVerificationState(): Promise<VerificationState | null> {
  try {
    const response = await apiClient.get<VerificationStateApiResponse>('/verification/me');
    return {
      status: response.status,
      createdAt: response.created_at,
      reviewedAt: response.reviewed_at,
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}
