import { FlatList } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RootStackRouteProp } from '../../../app/navigation/RootNavigator';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { MessageBubble } from '../components/MessageBubble';
import { MessageComposer } from '../components/MessageComposer';
import { useConversation } from '../hooks/useConversation';

/**
 * Conversation screen: thin composition only. Data comes from
 * useConversation; bubble/composer markup comes from MessageBubble and
 * MessageComposer.
 */
export function ConversationScreen() {
  const route = useRoute<RootStackRouteProp<'Conversation'>>();
  const { messages, draft, setDraft, send } = useConversation(route.params.conversationId);

  return (
    <ScreenContainer>
      <FlatList
        data={messages}
        keyExtractor={(message) => message.id}
        renderItem={({ item }) => <MessageBubble isOwnMessage={false} message={item} />}
      />
      <MessageComposer draft={draft} onChangeDraft={setDraft} onSend={send} />
    </ScreenContainer>
  );
}
