import { FlatList, Text } from 'react-native';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { LikeListItem } from '../components/LikeListItem';
import { useReceivedLikes } from '../hooks/useReceivedLikes';

/**
 * Likes screen: thin composition only. Data comes from useReceivedLikes;
 * row markup comes from LikeListItem.
 */
export function LikesScreen() {
  const { data: likes } = useReceivedLikes();

  return (
    <ScreenContainer>
      <FlatList
        ListEmptyComponent={<Text>No likes yet.</Text>}
        data={likes}
        keyExtractor={(like) => like.id}
        renderItem={({ item }) => <LikeListItem like={item} />}
      />
    </ScreenContainer>
  );
}
