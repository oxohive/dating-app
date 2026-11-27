import { useNavigation, useRoute } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import type { RootNavigationProp, RootStackRouteProp } from '../../../app/navigation/RootNavigator';
import { Button } from '../../../components/Button';
import { ErrorText } from '../../../components/ErrorText';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { spacing, typography } from '../../../core/theme';
import { SandboxBadge } from '../components/SandboxBadge';
import { useCheckoutSession } from '../hooks/useCheckoutSession';

/**
 * Sandboxed checkout trigger: this wave has no real Razorpay keys (see the
 * plan's explicit instruction), so this screen never embeds a real payment
 * SDK — it clearly labels itself as a sandbox and, on "Simulate payment",
 * calls the backend's checkout-session-creation endpoint followed by the
 * assumed sandbox-completion step (see `api/subscriptions.api.ts`).
 */
export function CheckoutScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<RootStackRouteProp<'Checkout'>>();
  const { plan } = route.params;
  const { startSandboxCheckout, isProcessing, isComplete, error } = useCheckoutSession();

  if (isComplete) {
    navigation.replace('SubscriptionStatus');
    return null;
  }

  return (
    <ScreenContainer>
      <View style={styles.section}>
        <SandboxBadge />
        <Text style={styles.title}>Checkout — {plan} plan</Text>
        <Text style={styles.body}>
          This wave uses a sandboxed checkout: there is no real Razorpay integration yet, so no card details are
          collected and no money moves. Tap below to simulate a completed payment.
        </Text>
        {error ? <ErrorText message={error} /> : null}
        <Button disabled={isProcessing} label="Simulate payment" onPress={() => startSandboxCheckout(plan)} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  title: {
    ...typography.title,
  },
  body: {
    ...typography.body,
  },
});
