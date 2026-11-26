import { FlatList, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootNavigationProp } from '../../../app/navigation/RootNavigator';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { ConversationListItem } from '../components/ConversationListItem';
import { useConversations } from '../hooks/useConversations';

/**
 * Inbox screen: thin composition only. Data comes from useConversations;
 * row markup comes from ConversationListItem; navigation is a single
 * callback wired through.
 */
export function InboxScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const { data: conversations } = useConversations();

  return (
    <ScreenContainer>
      <FlatList
        ListEmptyComponent={<Text>No conversations yet.</Text>}
        data={conversations}
        keyExtractor={(conversation) => conversation.id}
        renderItem={({ item }) => (
          <ConversationListItem
            conversation={item}
            onPress={(conversationId) => navigation.navigate('Conversation', { conversationId })}
          />
        )}
      />
    </ScreenContainer>
  );
}
