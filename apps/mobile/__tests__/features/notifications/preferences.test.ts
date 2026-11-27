import { NOTIFICATION_PREFERENCE_FIELDS, togglePreference } from '../../../src/features/notifications/preferences';
import type { NotificationPreferences } from '../../../src/features/notifications/api/notifications.api';

function preferences(overrides: Partial<NotificationPreferences> = {}): NotificationPreferences {
  return {
    newLike: true,
    newMatch: true,
    newMessage: true,
    verificationResult: true,
    subscriptionEvents: true,
    ...overrides,
  };
}

describe('togglePreference (preference toggle state logic)', () => {
  it('flips the given field from true to false', () => {
    expect(togglePreference(preferences({ newLike: true }), 'newLike').newLike).toBe(false);
  });

  it('flips the given field from false to true', () => {
    expect(togglePreference(preferences({ newMatch: false }), 'newMatch').newMatch).toBe(true);
  });

  it('leaves every other field untouched', () => {
    const before = preferences({ newLike: true, newMatch: true, newMessage: false });
    const after = togglePreference(before, 'newLike');

    expect(after.newMatch).toBe(before.newMatch);
    expect(after.newMessage).toBe(before.newMessage);
    expect(after.verificationResult).toBe(before.verificationResult);
    expect(after.subscriptionEvents).toBe(before.subscriptionEvents);
  });

  it('does not mutate the input object', () => {
    const before = preferences({ newLike: true });
    togglePreference(before, 'newLike');
    expect(before.newLike).toBe(true);
  });
});

describe('NOTIFICATION_PREFERENCE_FIELDS', () => {
  it('has exactly one entry per togglable preference', () => {
    expect(NOTIFICATION_PREFERENCE_FIELDS.map((field) => field.key).sort()).toEqual(
      ['newLike', 'newMatch', 'newMessage', 'subscriptionEvents', 'verificationResult'].sort(),
    );
  });

  it('never includes a security-alert toggle, since security alerts are never user-disable-able', () => {
    const keys = NOTIFICATION_PREFERENCE_FIELDS.map((field) => field.key.toLowerCase());
    expect(keys.some((key) => key.includes('security'))).toBe(false);
  });
});
