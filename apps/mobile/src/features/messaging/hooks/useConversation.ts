import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMessages, sendMessage, type MessageDto } from '../api/messaging.api';

const PLACEHOLDER_MESSAGES: MessageDto[] = [];

/**
 * Loads a single conversation's message thread and exposes a send
 * handler. Placeholder empty state keeps the screen navigable before the
 * backend endpoint exists.
 */
export function useConversation(conversationId: string) {
  const [draft, setDraft] = useState('');

  const query = useQuery({
    queryKey: ['messaging', 'conversations', conversationId, 'messages'],
    queryFn: () => fetchMessages(conversationId),
    initialData: PLACEHOLDER_MESSAGES,
  });

  async function send() {
    if (!draft.trim()) return;
    await sendMessage(conversationId, draft);
    setDraft('');
  }

  return { messages: query.data, draft, setDraft, send };
}
