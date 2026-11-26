import { useQuery } from '@tanstack/react-query';
import { fetchConversations, type ConversationDto } from '../api/messaging.api';

const PLACEHOLDER_CONVERSATIONS: ConversationDto[] = [];

/**
 * Loads the inbox list of conversations (`GET /conversations`).
 */
export function useConversations() {
  return useQuery({
    queryKey: ['messaging', 'conversations'],
    queryFn: fetchConversations,
    initialData: PLACEHOLDER_CONVERSATIONS,
  });
}
