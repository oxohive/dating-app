import { apiClient } from '../../../core/apiClient';

export type ConversationDto = {
  id: string;
  match_id: string;
  /** The other participant's profile id — needed for block/report actions. */
  participant_profile_id: string;
  participant_display_name: string;
  participant_photo_url?: string | null;
  last_message_preview?: string | null;
  last_message_at?: string | null;
};

export type MessageDto = {
  id: string;
  conversation_id: string;
  sender_profile_id: string;
  content: string;
  created_at: string;
  read_at?: string | null;
};

export type FetchMessagesParams = {
  limit?: number;
  before?: string;
};

/** Pure helper: whether `message` was sent by the given profile. */
export function isSentByProfile(message: MessageDto, profileId: string | undefined): boolean {
  return message.sender_profile_id === profileId;
}

export async function fetchConversations(): Promise<ConversationDto[]> {
  return apiClient.get<ConversationDto[]>('/conversations');
}

export async function fetchMessages(conversationId: string, params: FetchMessagesParams = {}): Promise<MessageDto[]> {
  const query = new URLSearchParams();
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.before) query.set('before', params.before);

  const queryString = query.toString();
  const path = `/conversations/${conversationId}/messages${queryString ? `?${queryString}` : ''}`;

  return apiClient.get<MessageDto[]>(path);
}

export async function sendMessage(conversationId: string, content: string): Promise<MessageDto> {
  return apiClient.post<MessageDto>(`/conversations/${conversationId}/messages`, { content });
}
