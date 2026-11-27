import { useNavigation } from '@react-navigation/native';
import { FlatList, Text } from 'react-native';
import type { RootNavigationProp } from '../../../app/navigation/RootNavigator';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { ErrorText } from '../../../components/ErrorText';
import { getApiErrorMessage } from '../../../core/apiErrorMessage';
import { spacing } from '../../../core/theme';
import { IncomingLikeCard } from '../components/IncomingLikeCard';
import { IncomingLikesLockedBanner } from '../components/IncomingLikesLockedBanner';
import { useIncomingLikes } from '../hooks/useIncomingLikes';

/**
 * "See who liked you" screen: thin composition only. Data comes from
 * useIncomingLikes; markup comes from IncomingLikeCard (Premium, full
 * list) or IncomingLikesLockedBanner (free, count-only teaser that links
 * to the Wave-2 Plans screen).
 */
export function IncomingLikesScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const { data: result, isLoading, error } = useIncomingLikes();

  if (isLoading) {
    return (
      <ScreenContainer>
        <Text>Loading who liked you...</Text>
      </ScreenContainer>
    );
  }

  if (error || !result) {
    return (
      <ScreenContainer>
        <ErrorText message={error ? getApiErrorMessage(error) : 'Could not load your incoming likes.'} />
      </ScreenContainer>
    );
  }

  if (!result.isPremium) {
    return (
      <ScreenContainer>
        <IncomingLikesLockedBanner count={result.count} onPressUpsell={() => navigation.navigate('Plans')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <FlatList
        contentContainerStyle={{ gap: spacing.sm }}
        data={result.likers}
        keyExtractor={(liker) => liker.profile.id}
        ListEmptyComponent={<Text>No one has liked you yet.</Text>}
        renderItem={({ item }) => <IncomingLikeCard liker={item} />}
      />
    </ScreenContainer>
  );
}
