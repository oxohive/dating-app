import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import type { RootNavigationProp } from '../../../app/navigation/RootNavigator';
import { useAuthStore } from '../../auth/store/authStore';
import { deleteAccount } from '../api/account.api';
import { completeAccountDeletion } from '../accountDeletion';

/**
 * Drives the irreversible account-deletion action: calls `POST
 * /auth/account/delete`, then clears local session state (the same
 * mechanism `useLogout` uses) and navigates to the login screen.
 * Confirmation is the caller's responsibility (see
 * `buildDeleteAccountAlertSpec`) — this hook assumes it has already
 * been confirmed by the time `deleteAccount()` is invoked.
 */
export function useDeleteAccount() {
  const navigation = useNavigation<RootNavigationProp>();
  const clearSession = useAuthStore((state) => state.clearSession);

  const mutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () =>
      completeAccountDeletion({
        clearSession,
        navigateToLogin: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }),
      }),
  });

  return {
    deleteAccount: () => mutation.mutate(),
    isDeletingAccount: mutation.isPending,
    deleteAccountError: mutation.error,
  };
}
