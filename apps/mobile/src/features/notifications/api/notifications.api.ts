import { apiClient } from '../../../core/apiClient';

/**
 * Wave 3, subtask M4 — `tasks/0012-wave3-engagement-and-lifecycle/plan.md`.
 * Reconciled during integration against B7's landed backend
 * (`services/backend/packages/api/features/notifications/schemas.py`,
 * `routes.py`) — all shapes below are confirmed, not assumed:
 *  - `POST /notifications/push-tokens` — `{ token, platform }` body,
 *    `platform` one of `"ios" | "android"`. Response body ignored (void) —
 *    the caller only needs to know the call succeeded.
 *  - `DELETE /notifications/push-tokens` — `{ token }` body (rather than
 *    the token in the URL, since Expo push tokens contain characters like
 *    `[`/`]` that would need careful encoding in a path segment).
 *  - `GET /notifications/preferences` — returns the five preference
 *    booleans plus `updated_at`.
 *  - `PUT /notifications/preferences` — partial update (not PATCH); only
 *    changed fields need to be sent. Same response shape as the GET.
 * Security alerts are never a preference (per plan.md: "Security alerts are
 * never user-disable-able — not a column, always sent") — there is
 * deliberately no field for them below.
 */

export type PushTokenPlatform = 'ios' | 'android';

/** `POST /notifications/push-tokens` — registers this device's Expo push token. */
export async function registerPushToken(token: string, platform: PushTokenPlatform): Promise<void> {
  await apiClient.post<void>('/notifications/push-tokens', { token, platform });
}

/** `DELETE /notifications/push-tokens` — removes a previously-registered token (e.g. on logout). */
export async function unregisterPushToken(token: string): Promise<void> {
  await apiClient.delete<void>('/notifications/push-tokens', { body: { token } });
}

export type NotificationPreferences = {
  newLike: boolean;
  newMatch: boolean;
  newMessage: boolean;
  verificationResult: boolean;
  subscriptionEvents: boolean;
};

type NotificationPreferencesApiResponse = {
  new_like: boolean;
  new_match: boolean;
  new_message: boolean;
  verification_result: boolean;
  subscription_events: boolean;
};

export type UpdateNotificationPreferencesInput = Partial<NotificationPreferences>;

function toNotificationPreferences(response: NotificationPreferencesApiResponse): NotificationPreferences {
  return {
    newLike: response.new_like,
    newMatch: response.new_match,
    newMessage: response.new_message,
    verificationResult: response.verification_result,
    subscriptionEvents: response.subscription_events,
  };
}

/** `GET /notifications/preferences` — the signed-in user's current preference toggles. */
export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  const response = await apiClient.get<NotificationPreferencesApiResponse>('/notifications/preferences');
  return toNotificationPreferences(response);
}

/** `PUT /notifications/preferences` — partial update; only changed fields need to be sent. */
export async function updateNotificationPreferences(
  input: UpdateNotificationPreferencesInput,
): Promise<NotificationPreferences> {
  const payload: Record<string, unknown> = {};
  if (input.newLike !== undefined) payload.new_like = input.newLike;
  if (input.newMatch !== undefined) payload.new_match = input.newMatch;
  if (input.newMessage !== undefined) payload.new_message = input.newMessage;
  if (input.verificationResult !== undefined) payload.verification_result = input.verificationResult;
  if (input.subscriptionEvents !== undefined) payload.subscription_events = input.subscriptionEvents;

  const response = await apiClient.put<NotificationPreferencesApiResponse>('/notifications/preferences', payload);
  return toNotificationPreferences(response);
}
