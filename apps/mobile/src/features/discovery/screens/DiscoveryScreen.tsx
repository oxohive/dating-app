import { useNavigation } from '@react-navigation/native';
import type { RootNavigationProp } from '../../../app/navigation/RootNavigator';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { QuotaExceededBanner } from '../../likes/components/QuotaExceededBanner';
import { QuotaIndicator } from '../../likes/components/QuotaIndicator';
import { useLikeQuota } from '../../likes/hooks/useLikeQuota';
import { useIsPremium } from '../../subscriptions/hooks/useIsPremium';
import { MatchCelebration } from '../components/MatchCelebration';
import { RadiusPicker } from '../components/RadiusPicker';
import { SwipeDeck } from '../components/SwipeDeck';
import { useDiscoveryFeed } from '../hooks/useDiscoveryFeed';
import { useLocationSync } from '../hooks/useLocationSync';
import { useDiscoveryPreferencesStore } from '../store/discoveryPreferencesStore';

/**
 * Discovery screen: thin composition only. Feed/swipe state comes from
 * useDiscoveryFeed; the daily quota readout comes from useLikeQuota
 * (shared with the dedicated Likes screen); markup comes from SwipeDeck,
 * QuotaIndicator, QuotaExceededBanner, MatchCelebration and RadiusPicker.
 * `useLocationSync` captures and sends the device's real GPS position for
 * Premium users (integration item 4) — it never changes who the existing
 * `isPremium` gate admits, it only adds a side-effect + a second locked
 * state (`locationPermissionDenied`) for users who pass that gate but
 * haven't granted device location permission.
 */
export function DiscoveryScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const { candidates, swipe, match, dismissMatch, quotaExceeded, dismissQuotaExceeded } = useDiscoveryFeed();
  const { data: quota } = useLikeQuota();
  const { isPremium } = useIsPremium();
  const { permissionDenied: locationPermissionDenied } = useLocationSync(isPremium);
  const radius = useDiscoveryPreferencesStore((state) => state.radius);
  const setRadius = useDiscoveryPreferencesStore((state) => state.setRadius);

  function handleViewMatch() {
    dismissMatch();
    navigation.navigate('Matches');
  }

  return (
    <ScreenContainer>
      {quota ? <QuotaIndicator quota={quota} /> : null}
      {quotaExceeded && quota ? <QuotaExceededBanner onDismiss={dismissQuotaExceeded} resetsAt={quota.resets_at} /> : null}
      <RadiusPicker
        isPremium={isPremium}
        locationPermissionDenied={locationPermissionDenied}
        onPressUpsell={() => navigation.navigate('Plans')}
        onSelect={setRadius}
        selected={radius}
      />
      <SwipeDeck candidates={candidates} onSwipe={swipe} />
      {match ? (
        <MatchCelebration
          matchedDisplayName={match.matchedProfile.display_name}
          onDismiss={dismissMatch}
          onViewMatch={handleViewMatch}
          visible
        />
      ) : null}
    </ScreenContainer>
  );
}
