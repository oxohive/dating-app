import type { NotificationPreferences } from './api/notifications.api';

/** The key of a single togglable preference. Deliberately excludes security alerts (never togglable). */
export type NotificationPreferenceKey = keyof NotificationPreferences;

export type NotificationPreferenceField = {
  key: NotificationPreferenceKey;
  label: string;
  description: string;
};

/**
 * The fixed set of toggles the preferences screen renders, in display
 * order. Driven from here (not hardcoded per-toggle in the screen) so
 * adding a field is a one-line change. Security alerts are intentionally
 * absent — per `tasks/0012-wave3-engagement-and-lifecycle/plan.md`, they
 * are never user-disable-able and have no backing column.
 */
export const NOTIFICATION_PREFERENCE_FIELDS: NotificationPreferenceField[] = [
  { key: 'newLike', label: 'New likes', description: "When someone likes you." },
  { key: 'newMatch', label: 'New matches', description: 'When you match with someone.' },
  { key: 'newMessage', label: 'New messages', description: 'When you receive a new message.' },
  { key: 'verificationResult', label: 'Verification updates', description: 'When your photo verification is approved or rejected.' },
  { key: 'subscriptionEvents', label: 'Subscription updates', description: 'Renewals, cancellations, and other billing events.' },
];

/**
 * Flips a single preference, leaving every other field untouched. Pure so
 * the toggle-screen's optimistic-update logic is trivially testable without
 * rendering anything.
 */
export function togglePreference(
  preferences: NotificationPreferences,
  key: NotificationPreferenceKey,
): NotificationPreferences {
  return { ...preferences, [key]: !preferences[key] };
}
