import { useCallback, useState } from 'react';
import { FlatList, Text } from 'react-native';
import type { ListRenderItem } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RootStackRouteProp } from '../../../app/navigation/RootNavigator';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { ReportDialog } from '../../safety/components/ReportDialog';
import { ConversationActions } from '../components/ConversationActions';
import { MessageBubble } from '../components/MessageBubble';
import { MessageComposer } from '../components/MessageComposer';
import { useConversation } from '../hooks/useConversation';
import type { MessageDto } from '../api/messaging.api';

/**
 * Conversation screen: thin composition only. Data comes from
 * useConversation; bubble/composer markup comes from MessageBubble and
 * MessageComposer; block/report actions come from ConversationActions and
 * ReportDialog (safety feature).
 */
export function ConversationScreen() {
  const route = useRoute<RootStackRouteProp<'Conversation'>>();
  const { messages, draft, setDraft, send, myProfileId, participantProfileId } = useConversation(
    route.params.conversationId,
  );
  const [isReporting, setIsReporting] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  // The screen re-renders on every keystroke of the message draft (state
  // lives in useConversation, consumed below via MessageComposer), and a
  // conversation's message history can grow long — without useCallback,
  // renderItem would be a new function identity on every keystroke, which
  // defeats FlatList/VirtualizedList's ability to skip re-rendering
  // off-screen-unchanged rows while the user is just typing.
  const renderItem: ListRenderItem<MessageDto> = useCallback(
    ({ item }) => <MessageBubble isOwnMessage={item.sender_profile_id === myProfileId} message={item} />,
    [myProfileId],
  );

  if (isBlocked) {
    return (
      <ScreenContainer>
        <Text>You&apos;ve blocked this user. This conversation is no longer available.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {participantProfileId ? (
        <ConversationActions
          onBlocked={() => setIsBlocked(true)}
          onReportPress={() => setIsReporting(true)}
          participantProfileId={participantProfileId}
        />
      ) : null}
      {isReporting && participantProfileId ? (
        <ReportDialog onSubmitted={() => setIsReporting(false)} reportedProfileId={participantProfileId} />
      ) : null}
      <FlatList data={messages} keyExtractor={(message) => message.id} renderItem={renderItem} />
      <MessageComposer draft={draft} onChangeDraft={setDraft} onSend={send} />
    </ScreenContainer>
  );
}
