import { apiClient, ApiError } from '../../../core/apiClient';

export type LikeQuota = {
  used: number;
  limit: number;
  /** ISO-8601 timestamp of when the daily quota resets. */
  resets_at: string;
};

export type SubmitLikeResult =
  | { outcome: 'liked'; likeId: string; matched: false }
  | { outcome: 'liked'; likeId: string; matched: true; matchId: string }
  | { outcome: 'quota_exceeded' };

/**
 * How many likes are left in the current UTC day's quota. Pure so it's
 * trivially testable and reusable by any component that needs to render
 * remaining-likes copy.
 */
export function remainingLikes(quota: LikeQuota): number {
  return Math.max(quota.limit - quota.used, 0);
}

export async function fetchLikeQuota(): Promise<LikeQuota> {
  return apiClient.get<LikeQuota>('/likes/quota');
}

/**
 * Submits a like on another profile. The documented error case for this
 * endpoint is a 403 with `{error: "quota_exceeded"}`, which is modeled as
 * a normal return value rather than a thrown error — callers shouldn't
 * need a try/catch to handle it. Any other failure (including a 403 with
 * a different body) is re-thrown.
 */
export async function submitLike(toProfileId: string): Promise<SubmitLikeResult> {
  try {
    const response = await apiClient.post<{ like_id: string; matched: boolean; match_id?: string }>('/likes', {
      to_profile_id: toProfileId,
    });

    if (response.matched && response.match_id) {
      return { outcome: 'liked', likeId: response.like_id, matched: true, matchId: response.match_id };
    }

    return { outcome: 'liked', likeId: response.like_id, matched: false };
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      const body = error.body as { error?: string } | undefined;
      if (body?.error === 'quota_exceeded') {
        return { outcome: 'quota_exceeded' };
      }
    }

    throw error;
  }
}
