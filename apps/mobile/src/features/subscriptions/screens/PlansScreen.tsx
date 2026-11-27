import { useNavigation } from '@react-navigation/native';
import { FlatList, Text } from 'react-native';
import type { RootNavigationProp } from '../../../app/navigation/RootNavigator';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { spacing } from '../../../core/theme';
import { PlanOptionCard } from '../components/PlanOptionCard';
import { usePlanCatalogue } from '../hooks/usePlanCatalogue';
import type { SubscriptionPlan } from '../api/subscriptions.api';

/**
 * Premium upsell/plan-catalogue screen: thin composition only. Loads the
 * catalogue via `usePlanCatalogue`; selecting a plan navigates to the
 * (sandboxed) checkout screen.
 */
export function PlansScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const { data: plans, isLoading } = usePlanCatalogue();

  function handleSelect(plan: SubscriptionPlan) {
    navigation.navigate('Checkout', { plan: plan.plan });
  }

  if (isLoading) {
    return (
      <ScreenContainer>
        <Text>Loading plans...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <FlatList
        contentContainerStyle={{ gap: spacing.sm }}
        data={plans ?? []}
        keyExtractor={(plan) => plan.id}
        renderItem={({ item }) => <PlanOptionCard onSelect={handleSelect} plan={item} />}
      />
    </ScreenContainer>
  );
}
