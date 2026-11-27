/**
 * The foreground-display behavior for every incoming push notification
 * (new like, new match, new message, verification result, subscription
 * event). A flat object rather than inline in `setNotificationHandler` so
 * it's trivially unit-testable and documents the intent in one place:
 * always show the banner/alert and play a sound while the app is open,
 * never touch the badge count (no unread-count feature exists yet to back
 * a badge number with).
 */
export function getForegroundNotificationBehavior() {
  return {
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  };
}
