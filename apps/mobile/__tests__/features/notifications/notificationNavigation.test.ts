import { resolveNotificationNavigationTarget } from '../../../src/features/notifications/notificationNavigation';

describe('resolveNotificationNavigationTarget', () => {
  it('returns null for a null/undefined payload', () => {
    expect(resolveNotificationNavigationTarget(null)).toBeNull();
    expect(resolveNotificationNavigationTarget(undefined)).toBeNull();
  });

  it('routes a new_like notification to IncomingLikes', () => {
    expect(resolveNotificationNavigationTarget({ type: 'new_like' })).toEqual({ screen: 'IncomingLikes' });
  });

  it('routes a new_match notification to Matches', () => {
    expect(resolveNotificationNavigationTarget({ type: 'new_match', match_id: 'match-1' })).toEqual({ screen: 'Matches' });
  });

  it('routes a new_message notification to its Conversation, with the conversation id', () => {
    expect(resolveNotificationNavigationTarget({ type: 'new_message', conversation_id: 'conversation-1' })).toEqual({
      screen: 'Conversation',
      params: { conversationId: 'conversation-1' },
    });
  });

  it('falls back to Matches for a new_message notification missing a conversation id', () => {
    expect(resolveNotificationNavigationTarget({ type: 'new_message' })).toEqual({ screen: 'Matches' });
  });

  it('accepts a camelCase conversationId as a fallback to snake_case', () => {
    expect(resolveNotificationNavigationTarget({ type: 'new_message', conversationId: 'conversation-2' })).toEqual({
      screen: 'Conversation',
      params: { conversationId: 'conversation-2' },
    });
  });

  it('routes a verification_result notification to VerificationStatus', () => {
    expect(resolveNotificationNavigationTarget({ type: 'verification_result' })).toEqual({ screen: 'VerificationStatus' });
  });

  it('routes a subscription_activated notification to SubscriptionStatus', () => {
    expect(resolveNotificationNavigationTarget({ type: 'subscription_activated' })).toEqual({ screen: 'SubscriptionStatus' });
  });

  it('returns null for a security_alert notification (no dedicated screen to open)', () => {
    expect(resolveNotificationNavigationTarget({ type: 'security_alert' })).toBeNull();
  });

  it('returns null for an unrecognized or missing type', () => {
    expect(resolveNotificationNavigationTarget({})).toBeNull();
    expect(resolveNotificationNavigationTarget({ type: 'something_else' })).toBeNull();
  });
});
