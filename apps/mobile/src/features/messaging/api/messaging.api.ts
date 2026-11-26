import { apiClient } from '../../../core/apiClient';

export type ConversationDto = {
  id: string;
  participantName: string;
  lastMessagePreview: string;
  participantPhotoUrl?: string;
};

export type MessageDto = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  sentAt: string;
};

/**
 * TODO(backend-messaging-inbox): wire up to the backend's messaging
 * feature slice once the conversation list endpoint exists
 * (services/backend/messaging).
 */
export async function fetchConversations(): Promise<ConversationDto[]> {
  return apiClient.get<ConversationDto[]>('/messaging/conversations');
}

/**
 * TODO(backend-messaging-thread): wire up to the backend's messaging
 * feature slice once the message thread endpoint exists
 * (services/backend/messaging).
 */
export async function fetchMessages(conversationId: string): Promise<MessageDto[]> {
  return apiClient.get<MessageDto[]>(`/messaging/conversations/${conversationId}/messages`);
}

/**
 * TODO(backend-messaging-send): wire up to the backend's messaging
 * feature slice once the send-message endpoint exists
 * (services/backend/messaging).
 */
export async function sendMessage(conversationId: string, text: string): Promise<MessageDto> {
  return apiClient.post<MessageDto>(`/messaging/conversations/${conversationId}/messages`, { text });
}
