import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '../../../core/apiErrorMessage';
import { completeSandboxCheckout, createCheckoutSession, type SubscriptionPlanId } from '../api/subscriptions.api';
import { MY_SUBSCRIPTION_QUERY_KEY } from './useMySubscription';

/**
 * Drives the sandboxed checkout flow: create a checkout session for the
 * chosen plan, then immediately "simulate payment" (there are no real
 * Razorpay keys this wave — see `api/subscriptions.api.ts`'s module note).
 * A real integration would hand the session off to the Razorpay SDK here
 * instead of calling `completeSandboxCheckout` directly.
 */
export function useCheckoutSession() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (plan: SubscriptionPlanId) => {
      const session = await createCheckoutSession(plan);
      await completeSandboxCheckout(session.sessionId, plan);
      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_SUBSCRIPTION_QUERY_KEY });
    },
  });

  return {
    startSandboxCheckout: (plan: SubscriptionPlanId) => mutation.mutate(plan),
    isProcessing: mutation.isPending,
    isComplete: mutation.isSuccess,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not complete the sandbox checkout. Please try again.') : null,
  };
}
