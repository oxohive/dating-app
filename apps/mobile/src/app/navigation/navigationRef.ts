import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './RootNavigator';

/**
 * Lets code outside the navigator tree (e.g. a notification-tap handler
 * mounted as a sibling of `RootNavigator`, not a screen inside it) trigger
 * navigation without `useNavigation()`, which only works for components
 * actually rendered inside a `Navigator`. Attach via
 * `<NavigationContainer ref={navigationRef}>` in `App.tsx`.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Safe to call from anywhere; no-ops if the navigator isn't mounted yet.
 * Casts to `never` are React Navigation's own documented pattern for this
 * exact "navigate from outside the component tree" case — the overloaded
 * `navigate()` signature `@react-navigation/native` exposes doesn't reduce
 * cleanly through a generic wrapper, so the cast is intentional, not a
 * type-safety gap introduced here (every call site is still typed against
 * `RootStackParamList` directly).
 */
export function navigate<RouteName extends keyof RootStackParamList>(
  screen: RouteName,
  params?: RootStackParamList[RouteName],
): void {
  if (navigationRef.isReady()) {
    const navigate = navigationRef.navigate as (name: RouteName, params?: RootStackParamList[RouteName]) => void;
    navigate(screen, params);
  }
}
