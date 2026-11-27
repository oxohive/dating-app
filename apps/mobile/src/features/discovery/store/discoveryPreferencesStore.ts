import { create } from 'zustand';
import { DEFAULT_RADIUS, type RadiusKm } from '../radius';

type DiscoveryPreferencesState = {
  radius: RadiusKm;
  setRadius: (radius: RadiusKm) => void;
};

/**
 * Zustand slice for the user's selected discovery radius preference.
 * Shared between the Discovery screen (where it affects the feed) and the
 * Profile screen (where it's also exposed as a "search preferences"
 * setting) so both read/write the same selection rather than each owning
 * a local copy that can drift.
 */
export const useDiscoveryPreferencesStore = create<DiscoveryPreferencesState>((set) => ({
  radius: DEFAULT_RADIUS,
  setRadius: (radius) => set({ radius }),
}));
