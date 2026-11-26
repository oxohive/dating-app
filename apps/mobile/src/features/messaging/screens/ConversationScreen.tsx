import { useState } from 'react';
import { FlatList, Text } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RootStackRouteProp } from '../../../app/navigation/RootNavigator';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { ReportDialog } from '../../safety/components/ReportDialog';
import { ConversationActions } from '../components/ConversationActions';
import { MessageBubble } from '../components/MessageBubble';
import { MessageComposer } from '../components/MessageComposer';
import { useConversation } from '../hooks/useConversation';

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
      <FlatList
        data={messages}
        keyExtractor={(message) => message.id}
        renderItem={({ item }) => <MessageBubble isOwnMessage={item.sender_profile_id === myProfileId} message={item} />}
      />
      <MessageComposer draft={draft} onChangeDraft={setDraft} onSend={send} />
    </ScreenContainer>
  );
}
