import { apiClient } from "@/lib/apiClient";

export type VerificationStatus = "pending" | "approved" | "rejected";
export type VerificationStatusFilter = VerificationStatus | "all";

export interface Verification {
  id: string;
  profileId: string;
  profileDisplayName: string;
  status: VerificationStatus;
  selfieUrl: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

/**
 * Real shape of `VerificationAdminOut` (subtask B6,
 * `services/backend/packages/api/features/admin/schemas.py`), the admin
 * review-queue response returned by both `GET /admin/verifications` and
 * `POST /admin/verifications/{id}/review`. Reconciled against the real
 * backend contract (previously built against an assumed shape, documented
 * here for history):
 *
 * - `selfie_url` is a resolved, directly-viewable presigned URL (never the
 *   raw `selfie_s3_key`), resolved server-side the same way
 *   `profiles.photo_service.build_photo_url` resolves profile photos.
 * - `display_name` (required `str`, not `profile_display_name` and not
 *   optional) is denormalized onto the admin response by the backend, so
 *   no client-side fallback is needed.
 */
interface VerificationAdminApiModel {
  id: string;
  profile_id: string;
  display_name: string;
  status: VerificationStatus;
  selfie_url: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export function mapVerification(raw: VerificationAdminApiModel): Verification {
  return {
    id: raw.id,
    profileId: raw.profile_id,
    profileDisplayName: raw.display_name,
    status: raw.status,
    selfieUrl: raw.selfie_url,
    reviewedByUserId: raw.reviewed_by_user_id,
    reviewedAt: raw.reviewed_at,
    createdAt: raw.created_at,
  };
}

/**
 * Builds the list path for a given status filter. Extracted as a pure
 * function so the filtering behavior is directly unit-testable without
 * mocking `fetch` - same spirit as `src/lib/filterUsersByName.ts`.
 */
export function buildVerificationsQuery(filter: VerificationStatusFilter): string {
  if (filter === "all") {
    return "/admin/verifications";
  }
  return `/admin/verifications?status=${encodeURIComponent(filter)}`;
}

/**
 * Lists verification submissions, optionally filtered by status so the
 * same queue can show pending submissions (the default/primary job) and
 * review history for already-reviewed ones.
 * Real endpoint (`features/admin/routes.py`): `GET /admin/verifications`
 * (all) or `GET /admin/verifications?status=pending|approved|rejected`
 * -> 200 list (requires is_admin).
 */
export async function listVerifications(filter: VerificationStatusFilter = "pending"): Promise<Verification[]> {
  const results = await apiClient.get<VerificationAdminApiModel[]>(buildVerificationsQuery(filter));
  return results.map(mapVerification);
}

/**
 * Submits a review decision for a verification.
 * Real endpoint: `POST /admin/verifications/{id}/review` with body
 * `{"decision": "approve" | "reject"}` -> 200 VerificationAdminOut
 * (reviewed_by_user_id/reviewed_at set server-side from the authenticated
 * admin's session). This is the only review-action endpoint the backend
 * exposes - there is no separate `/approve`/`/reject` path.
 */
export async function reviewVerification(
  verificationId: string,
  decision: "approve" | "reject",
): Promise<Verification> {
  const result = await apiClient.post<VerificationAdminApiModel>(`/admin/verifications/${verificationId}/review`, {
    decision,
  });
  return mapVerification(result);
}

/**
 * Thin wrapper over `reviewVerification` for call sites that approve.
 */
export async function approveVerification(verificationId: string): Promise<Verification> {
  return reviewVerification(verificationId, "approve");
}

/**
 * Thin wrapper over `reviewVerification` for call sites that reject.
 */
export async function rejectVerification(verificationId: string): Promise<Verification> {
  return reviewVerification(verificationId, "reject");
}
