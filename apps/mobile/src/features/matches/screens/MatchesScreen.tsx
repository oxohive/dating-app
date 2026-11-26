import { FlatList, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootNavigationProp } from '../../../app/navigation/RootNavigator';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { MatchCard } from '../components/MatchCard';
import { useMatches } from '../hooks/useMatches';
import type { MatchDto } from '../api/matches.api';

/**
 * Matches screen: thin composition only. Data comes from useMatches; row
 * markup comes from MatchCard; navigation to the match's conversation is a
 * single callback wired through.
 */
export function MatchesScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const { matches, unmatch } = useMatches();

  function handlePress(match: MatchDto) {
    if (!match.conversation_id) return;
    navigation.navigate('Conversation', { conversationId: match.conversation_id });
  }

  return (
    <ScreenContainer>
      <FlatList
        ListEmptyComponent={<Text>No matches yet. Keep swiping!</Text>}
        data={matches}
        keyExtractor={(match) => match.id}
        renderItem={({ item }) => <MatchCard match={item} onPress={handlePress} onUnmatch={unmatch} />}
      />
    </ScreenContainer>
  );
}
