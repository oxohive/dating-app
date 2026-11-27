import { apiClient } from '../../../core/apiClient';
import { radiusToQueryParam, type RadiusKm } from '../radius';

/**
 * Approximate distance bands the backend returns for another profile.
 * Per `tasks/0010-wave2-deferred-features/plan.md`: the backend never
 * sends raw coordinates or a precise distance for anyone but the caller —
 * only one of these band labels. Assumed to arrive as an optional
 * `distance_band` field on each discovery-feed profile once B5 (backend
 * GPS discovery) lands; reconcile the field name/shape against whatever
 * B5 actually ships.
 */
export type DistanceBand = '<1km' | '1-3km' | '3-5km' | '5-10km' | '10-25km' | '25-50km' | '50-100km' | '100km+';

export type DiscoveryProfile = {
  id: string;
  display_name: string;
  age: number;
  bio?: string | null;
  interests?: string[] | null;
  city: string;
  locality: string;
  photo_urls: string[];
  /** Absent for a free user without a known/shared location; see `DistanceBand`'s note above. */
  distance_band?: DistanceBand | null;
};

export type DiscoveryFeedResponse = {
  profiles: DiscoveryProfile[];
  next_offset: number | null;
};

const FEED_PAGE_SIZE = 10;

/**
 * `radius` is the Premium-gated GPS radius tier (`resolveEffectiveRadius`
 * in `radius.ts` already resolves a non-Premium caller to `"any"` before
 * this is called, so this function doesn't need to re-check entitlement
 * itself). Assumed query param name is `radius_km`, sent as `"any"` or one
 * of the fixed tier values — reconcile against B5's actual param name.
 */
export async function fetchDiscoveryFeed(
  offset = 0,
  limit = FEED_PAGE_SIZE,
  radius?: RadiusKm,
): Promise<DiscoveryFeedResponse> {
  const radiusParam = radius !== undefined ? `&radius_km=${radiusToQueryParam(radius)}` : '';
  return apiClient.get<DiscoveryFeedResponse>(`/discovery/feed?limit=${limit}&offset=${offset}${radiusParam}`);
}

export async function passProfile(toProfileId: string): Promise<void> {
  await apiClient.post<void>('/discovery/pass', { to_profile_id: toProfileId });
}
