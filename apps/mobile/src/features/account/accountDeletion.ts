/**
 * Pure logic for the "Delete my account" flow, kept separate from
 * `ProfileScreen`/`useDeleteAccount` so the two things that actually need
 * covering — which button fires the irreversible action, and what runs
 * after the backend confirms deletion — are testable without rendering a
 * component or a hook. No component-rendering tests exist in this app
 * (see other features' `__tests__`), so this module is the pure-function
 * seam the plan asks for.
 */

export type AccountDeletionAlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

export type AccountDeletionAlertSpec = {
  title: string;
  message: string;
  buttons: AccountDeletionAlertButton[];
};

/**
 * Builds the confirmation alert for account deletion, mirroring
 * `BlockButton`'s existing `Alert.alert(title, message, [cancel,
 * destructive])` convention (`features/safety/components/BlockButton.tsx`)
 * rather than inventing a new confirmation UI. `onConfirm` only fires from
 * the destructive button; the cancel button intentionally carries no
 * `onPress`, so nothing happens on cancel.
 */
export function buildDeleteAccountAlertSpec(onConfirm: () => void): AccountDeletionAlertSpec {
  return {
    title: 'Delete your account?',
    message: 'This permanently deletes your account and cannot be undone. You will be signed out immediately.',
    buttons: [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete my account', style: 'destructive', onPress: onConfirm },
    ],
  };
}

export type CompleteAccountDeletionDeps = {
  /** Same effect `useLogout`'s `onSettled` produces: clears local session state. */
  clearSession: () => void;
  navigateToLogin: () => void;
};

/**
 * Runs once the backend has confirmed the account is deleted: clears
 * local session state first, then navigates to the login screen. Order
 * matters for tests/callers to be able to assert on, even though both
 * are synchronous here.
 */
export function completeAccountDeletion({ clearSession, navigateToLogin }: CompleteAccountDeletionDeps): void {
  clearSession();
  navigateToLogin();
}
