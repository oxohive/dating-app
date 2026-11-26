import { Text } from 'react-native';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { QuotaExceededBanner } from '../components/QuotaExceededBanner';
import { QuotaIndicator } from '../components/QuotaIndicator';
import { remainingLikes } from '../api/likes.api';
import { useLikeQuota } from '../hooks/useLikeQuota';

/**
 * Likes screen: the dedicated home for the daily like quota. Thin
 * composition only — quota data comes from useLikeQuota; markup comes from
 * QuotaIndicator/QuotaExceededBanner. A compact QuotaIndicator is also
 * embedded directly on the Discovery screen so the count stays visible
 * while swiping; this screen is for anyone who wants the fuller picture.
 */
export function LikesScreen() {
  const { data: quota, isLoading } = useLikeQuota();

  if (isLoading || !quota) {
    return (
      <ScreenContainer>
        <Text>Loading your likes...</Text>
      </ScreenContainer>
    );
  }

  const remaining = remainingLikes(quota);

  return (
    <ScreenContainer>
      <QuotaIndicator quota={quota} />
      {remaining === 0 ? <QuotaExceededBanner resetsAt={quota.resets_at} /> : null}
      <Text>
        You&apos;ve sent {quota.used} of {quota.limit} likes today.
      </Text>
    </ScreenContainer>
  );
}
