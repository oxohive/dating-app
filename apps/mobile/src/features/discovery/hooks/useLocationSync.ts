import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { updateMyLocation } from '../../location/api/location.api';

/**
 * Integration item 4 (`tasks/0010-wave2-deferred-features/status.md`):
 * M3 built the radius-tier picker but never captured or sent a real
 * device GPS position, so Premium GPS discovery had nothing to filter
 * against. This hook requests foreground location permission and, once
 * granted, reads the device's current position and PUTs it to the
 * backend via `updateMyLocation` — wired into `DiscoveryScreen` on mount,
 * gated behind the EXISTING `isPremium` check (this hook adds a
 * side-effect for users who already pass that gate; it never changes who
 * is gated).
 *
 * Never throws: a denied permission, a disabled location service, or a
 * network failure all just leave `permissionDenied` true so the UI can
 * show a locked radius picker instead of crashing the screen.
 */
export function useLocationSync(isPremium: boolean): { permissionDenied: boolean } {
  // Starts `true` (locked) rather than `false` so the picker never briefly
  // renders "unlocked" before the permission check resolves.
  const [permissionDenied, setPermissionDenied] = useState(true);

  useEffect(() => {
    if (!isPremium) {
      // Not Premium: the picker is already locked by the `!isPremium`
      // upsell state, so there's no point requesting location permission
      // or syncing a position yet.
      return;
    }

    let isCancelled = false;

    async function syncLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (isCancelled) {
          return;
        }
        if (status !== 'granted') {
          setPermissionDenied(true);
          return;
        }

        const position = await Location.getCurrentPositionAsync();
        if (isCancelled) {
          return;
        }
        setPermissionDenied(false);
        await updateMyLocation(position.coords.latitude, position.coords.longitude);
      } catch {
        // Covers a denied/unavailable location service and a failed
        // `updateMyLocation` call alike -- either way, fail closed into
        // the locked state rather than ever crashing the discovery screen.
        if (!isCancelled) {
          setPermissionDenied(true);
        }
      }
    }

    syncLocation();

    return () => {
      isCancelled = true;
    };
  }, [isPremium]);

  return { permissionDenied };
}
