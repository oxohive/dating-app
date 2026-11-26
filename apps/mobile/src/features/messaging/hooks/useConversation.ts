import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useProfile } from '../../profile/hooks/useProfile';
import { fetchMessages, sendMessage, type MessageDto } from '../api/messaging.api';
import { useConversations } from './useConversations';

const PLACEHOLDER_MESSAGES: MessageDto[] = [];

/**
 * Loads a single conversation's message thread (`GET
 * /conversations/{id}/messages`) and exposes a send handler
 * (`POST .../messages`). Also resolves the current user's own profile id
 * (via the profile feature's useProfile) and the other participant's
 * profile id (looked up from the conversations list cache) so the screen
 * can tell bubbles apart and wire block/report actions.
 */
export function useConversation(conversationId: string) {
  const [draft, setDraft] = useState('');
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ['messaging', 'conversations', conversationId, 'messages'],
    queryFn: () => fetchMessages(conversationId),
    initialData: PLACEHOLDER_MESSAGES,
  });

  const { data: conversations } = useConversations();
  const conversation = conversations.find((item) => item.id === conversationId);

  const { data: myProfile } = useProfile();

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendMessage(conversationId, content),
    onSuccess: (message) => {
      queryClient.setQueryData<MessageDto[]>(
        ['messaging', 'conversations', conversationId, 'messages'],
        (prev) => [...(prev ?? []), message],
      );
      queryClient.invalidateQueries({ queryKey: ['messaging', 'conversations'] });
    },
  });

  async function send() {
    const content = draft.trim();
    if (!content) return;

    setDraft('');
    await sendMutation.mutateAsync(content);
  }

  return {
    messages: messagesQuery.data,
    isLoading: messagesQuery.isLoading,
    draft,
    setDraft,
    send,
    myProfileId: myProfile?.id,
    participantProfileId: conversation?.participant_profile_id,
  };
}
