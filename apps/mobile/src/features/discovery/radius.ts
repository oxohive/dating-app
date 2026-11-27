/**
 * The GPS radius picker's fixed tier set, per
 * `tasks/0010-wave2-deferred-features/plan.md`: the backend's discovery
 * endpoint only accepts exactly these values (plus "any") — never a
 * free-form number — so this is deliberately a closed enum, not a range.
 */
export const RADIUS_OPTIONS = [1, 3, 5, 10, 25, 50, 100, 'any'] as const;

export type RadiusKm = (typeof RADIUS_OPTIONS)[number];

export const DEFAULT_RADIUS: RadiusKm = 'any';

/**
 * The radius the discovery feed should actually query with, given the
 * user's Premium status. Radius filtering is Premium-gated end to end
 * (plan.md: "GPS/nearby discovery read+write, radius filtering/ranking ...
 * must call `has_active_premium`") — the backend is the real enforcement
 * point, but the mobile client should never even *send* a restricted
 * radius for a non-Premium user, so this always resolves to "any" for
 * them regardless of whatever was last selected (e.g. before their
 * subscription expired).
 */
export function resolveEffectiveRadius(isPremium: boolean, selected: RadiusKm): RadiusKm {
  return isPremium ? selected : DEFAULT_RADIUS;
}

/**
 * Which locked state (if any) `RadiusPicker` should show, given the
 * user's Premium status and device location-permission status. This is
 * a separate decision from `resolveEffectiveRadius` above (that resolves
 * what radius to actually query with) — this resolves what the UI should
 * display/disable. There are two distinct locked states, never conflated:
 *  - `'not_premium'` — the existing upsell ("this is a Premium feature").
 *  - `'location_denied'` — new: the user IS Premium, but device location
 *    permission was denied (or never granted), so the picker has nothing
 *    to filter against even though the user is entitled to use it.
 * `null` means fully unlocked.
 */
export type RadiusPickerDisabledReason = 'not_premium' | 'location_denied' | null;

export function resolveRadiusPickerDisabledReason(
  isPremium: boolean,
  locationPermissionDenied: boolean,
): RadiusPickerDisabledReason {
  if (!isPremium) {
    return 'not_premium';
  }
  if (locationPermissionDenied) {
    return 'location_denied';
  }
  return null;
}

/** Query-param string for a given radius tier, e.g. `10` -> `"10"`, `"any"` -> `"any"`. */
export function radiusToQueryParam(radius: RadiusKm): string {
  return String(radius);
}

/** Display label for a radius tier, e.g. `10` -> `"10 km"`, `"any"` -> `"Any"`. */
export function formatRadiusLabel(radius: RadiusKm): string {
  return radius === 'any' ? 'Any' : `${radius} km`;
}
