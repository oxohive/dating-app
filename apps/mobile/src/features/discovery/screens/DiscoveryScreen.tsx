import { useNavigation } from '@react-navigation/native';
import type { RootNavigationProp } from '../../../app/navigation/RootNavigator';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { QuotaExceededBanner } from '../../likes/components/QuotaExceededBanner';
import { QuotaIndicator } from '../../likes/components/QuotaIndicator';
import { useLikeQuota } from '../../likes/hooks/useLikeQuota';
import { MatchCelebration } from '../components/MatchCelebration';
import { SwipeDeck } from '../components/SwipeDeck';
import { useDiscoveryFeed } from '../hooks/useDiscoveryFeed';

/**
 * Discovery screen: thin composition only. Feed/swipe state comes from
 * useDiscoveryFeed; the daily quota readout comes from useLikeQuota
 * (shared with the dedicated Likes screen); markup comes from SwipeDeck,
 * QuotaIndicator, QuotaExceededBanner and MatchCelebration.
 */
export function DiscoveryScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const { candidates, swipe, match, dismissMatch, quotaExceeded, dismissQuotaExceeded } = useDiscoveryFeed();
  const { data: quota } = useLikeQuota();

  function handleViewMatch() {
    dismissMatch();
    navigation.navigate('Matches');
  }

  return (
    <ScreenContainer>
      {quota ? <QuotaIndicator quota={quota} /> : null}
      {quotaExceeded && quota ? <QuotaExceededBanner onDismiss={dismissQuotaExceeded} resetsAt={quota.resets_at} /> : null}
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
