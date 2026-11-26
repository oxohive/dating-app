import { ScreenContainer } from '../../../components/ScreenContainer';
import { SwipeDeck } from '../components/SwipeDeck';
import { useDiscoveryFeed } from '../hooks/useDiscoveryFeed';

/**
 * Discovery screen: thin composition only. Feed state comes from
 * useDiscoveryFeed; markup comes from SwipeDeck.
 */
export function DiscoveryScreen() {
  const { candidates, swipe } = useDiscoveryFeed();

  return (
    <ScreenContainer>
      <SwipeDeck candidates={candidates} onSwipe={swipe} />
    </ScreenContainer>
  );
}
