import { FlatList, Text } from 'react-native';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { MatchCard } from '../components/MatchCard';
import { useMatches } from '../hooks/useMatches';

/**
 * Matches screen: thin composition only. Data comes from useMatches;
 * row markup comes from MatchCard.
 */
export function MatchesScreen() {
  const { data: matches } = useMatches();

  return (
    <ScreenContainer>
      <FlatList
        ListEmptyComponent={<Text>No matches yet.</Text>}
        data={matches}
        keyExtractor={(match) => match.id}
        renderItem={({ item }) => <MatchCard match={item} />}
      />
    </ScreenContainer>
  );
}
