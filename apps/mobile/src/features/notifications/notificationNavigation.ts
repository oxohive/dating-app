/**
 * Decides which existing screen a tapped push notification should open,
 * from the notification's `data` payload. Per the task brief: "navigate to
 * the relevant screen when a notification is tapped ... don't invent new
 * routes for this" — every target below is an existing route from
 * `RootNavigator` (Wave 1/2), except `IncomingLikes` and
 * `NotificationPreferences`, which this subtask adds itself.
 *
 * The backend's exact push-payload shape isn't settled yet (B7 upgrades
 * `notification_service.py`'s three functions in place; the integration
 * step still owns wiring the `new_like`/`new_match`/`verification_result`/
 * `subscription_activated` trigger call sites per plan.md). Assumed shape:
 * a `type` field matching one of the event-type names B7 defines in its own
 * `features/notifications/` module (`new_like`, `new_match`, `new_message`,
 * `verification_result`, `subscription_activated`, `security_alert`), plus
 * whatever id the target screen needs (`conversation_id` for a message,
 * `match_id` for a match). Snake_case is checked first since FCM data
 * payloads are plain string maps and this repo's wire format is
 * consistently snake_case elsewhere; a camelCase fallback is also accepted
 * defensively in case B7 ships it differently.
 */

export type NotificationNavigationTarget =
  | { screen: 'Matches' }
  | { screen: 'Conversation'; params: { conversationId: string } }
  | { screen: 'IncomingLikes' }
  | { screen: 'VerificationStatus' }
  | { screen: 'SubscriptionStatus' };

export type NotificationDataPayload = Record<string, unknown>;

function readString(data: NotificationDataPayload, snakeKey: string, camelKey: string): string | undefined {
  const value = data[snakeKey] ?? data[camelKey];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Pure by design: takes the notification's `data` payload, returns where to
 * navigate (or `null` for an event with nothing to open, e.g. a security
 * alert, or a payload this client doesn't recognize). Never throws.
 */
export function resolveNotificationNavigationTarget(data: NotificationDataPayload | null | undefined): NotificationNavigationTarget | null {
  if (!data) {
    return null;
  }

  const type = readString(data, 'type', 'type');

  switch (type) {
    case 'new_like':
      return { screen: 'IncomingLikes' };
    case 'new_match':
      return { screen: 'Matches' };
    case 'new_message': {
      const conversationId = readString(data, 'conversation_id', 'conversationId');
      return conversationId ? { screen: 'Conversation', params: { conversationId } } : { screen: 'Matches' };
    }
    case 'verification_result':
      return { screen: 'VerificationStatus' };
    case 'subscription_activated':
    case 'subscription_events':
      return { screen: 'SubscriptionStatus' };
    default:
      // Includes `security_alert` (no dedicated screen to deep-link to yet)
      // and any unrecognized/missing type.
      return null;
  }
}
