import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import type { RootNavigationProp } from '../../../app/navigation/RootNavigator';
import { Button } from '../../../components/Button';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { spacing, typography } from '../../../core/theme';
import { SubscriptionStatusCard } from '../components/SubscriptionStatusCard';
import { useMySubscription } from '../hooks/useMySubscription';

/**
 * "My subscription" status view: plan, status and expires_at, loaded via
 * TanStack Query. Offers a way to the plan catalogue when there's no
 * active subscription (none yet, or it expired/was cancelled).
 */
export function SubscriptionStatusScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const { data: subscription, isLoading } = useMySubscription();

  if (isLoading) {
    return (
      <ScreenContainer>
        <Text>Loading your subscription...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.section}>
        {subscription ? (
          <SubscriptionStatusCard subscription={subscription} />
        ) : (
          <Text style={styles.body}>You don&apos;t have a subscription yet.</Text>
        )}
        <Button
          label={subscription?.status === 'active' ? 'Manage plan' : 'See Premium plans'}
          onPress={() => navigation.navigate('Plans')}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  body: {
    ...typography.body,
  },
});
