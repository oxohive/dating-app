import { isSentByProfile, type MessageDto } from '../../../src/features/messaging/api/messaging.api';

function message(overrides: Partial<MessageDto> = {}): MessageDto {
  return {
    id: 'message-1',
    conversation_id: 'conversation-1',
    sender_profile_id: 'profile-a',
    content: 'hello',
    created_at: '2026-11-27T00:00:00.000Z',
    ...overrides,
  };
}

describe('isSentByProfile', () => {
  it('returns true when the message sender matches the given profile id', () => {
    expect(isSentByProfile(message({ sender_profile_id: 'profile-a' }), 'profile-a')).toBe(true);
  });

  it('returns false when the message sender does not match', () => {
    expect(isSentByProfile(message({ sender_profile_id: 'profile-a' }), 'profile-b')).toBe(false);
  });

  it('returns false when the given profile id is undefined', () => {
    expect(isSentByProfile(message({ sender_profile_id: 'profile-a' }), undefined)).toBe(false);
  });
});
