import { apiClient, ApiError } from '../../../core/apiClient';

/**
 * Wave 3, subtask M4 — "see who liked you" (`tasks/0012-wave3-engagement-and-lifecycle/plan.md`).
 * Reconciled during integration against B8's landed `GET /likes/incoming`
 * response shape:
 *  `{ is_premium: boolean, count: number, likes: [{ profile: { id,
 *    display_name, photo_url }, liked_at }, ...] }`.
 * `likes` is always `[]` when `is_premium` is false — there is no separate
 * discriminated-union shape on the wire; `is_premium`/`count` are always
 * present and `likes` just happens to be empty for free users.
 */

export type IncomingLikerProfile = {
  id: string;
  displayName: string;
  photoUrl: string | null;
};

export type IncomingLiker = {
  profile: IncomingLikerProfile;
  likedAt: string;
};

export type IncomingLikesResult = {
  isPremium: boolean;
  count: number;
  likers: IncomingLiker[];
};

type IncomingLikesApiResponse = {
  is_premium: boolean;
  count: number;
  likes: {
    profile: { id: string; display_name: string; photo_url: string | null };
    liked_at: string;
  }[];
};

/**
 * Maps the wire-shape `GET /likes/incoming` response to `IncomingLikesResult`.
 * Pulled out as a standalone function (same pattern as
 * `mapSubscriptionPlan` in `subscriptions.api.ts`) so the mapping is
 * independently testable without mocking `apiClient`.
 */
export function mapIncomingLikesResponse(response: IncomingLikesApiResponse): IncomingLikesResult {
  return {
    isPremium: response.is_premium,
    count: response.count,
    likers: response.likes.map((item) => ({
      profile: {
        id: item.profile.id,
        displayName: item.profile.display_name,
        photoUrl: item.profile.photo_url,
      },
      likedAt: item.liked_at,
    })),
  };
}

/**
 * `GET /likes/incoming` — "see who liked you". The backend decides which
 * branch to return based on `has_active_premium`; the client never derives
 * this itself, it just renders whichever shape comes back.
 */
export async function fetchIncomingLikes(): Promise<IncomingLikesResult> {
  const response = await apiClient.get<IncomingLikesApiResponse>('/likes/incoming');
  return mapIncomingLikesResponse(response);
}

/**
 * Teaser copy for the free/locked state, e.g. "3 people liked you" /
 * "1 person liked you". Pure so the pluralization is testable without
 * rendering the banner.
 */
export function describeIncomingLikesTeaser(count: number): string {
  if (count === 0) {
    return 'No one has liked you yet.';
  }
  return `${count} ${count === 1 ? 'person' : 'people'} liked you — upgrade to see who.`;
}

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
