import { apiClient } from '../../../core/apiClient';

/**
 * Wave 2, subtask M3 integration — mirrors the backend's own feature
 * boundary: `services/backend/packages/api/features/location/**` is a
 * separate feature from `discovery` (GPS position storage vs. the feed
 * that reads it), so this client lives in its own `features/location/**`
 * directory on mobile too, rather than inside `discovery/api/`, matching
 * how every other mobile feature directory maps 1:1 onto a backend
 * feature of the same name.
 *
 * `PUT /location/me` is Premium-gated server-side (403 for a non-Premium
 * caller) — this client doesn't re-check entitlement itself, matching the
 * pattern in `discovery/radius.ts` where gating is enforced by the
 * backend and only *offered* conditionally by the UI.
 */

export type MyLocation = {
  profileId: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
};

type LocationApiResponse = {
  profile_id: string;
  latitude: number;
  longitude: number;
  updated_at: string;
};

/** `PUT /location/me` — updates the caller's own GPS position. */
export async function updateMyLocation(latitude: number, longitude: number): Promise<MyLocation> {
  const response = await apiClient.put<LocationApiResponse>('/location/me', { latitude, longitude });
  return {
    profileId: response.profile_id,
    latitude: response.latitude,
    longitude: response.longitude,
    updatedAt: response.updated_at,
  };
}
