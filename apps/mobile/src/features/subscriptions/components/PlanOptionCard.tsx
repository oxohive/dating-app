import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { colors, spacing, typography } from '../../../core/theme';
import type { SubscriptionPlan } from '../api/subscriptions.api';
import { formatPlanPrice } from '../formatPlanPrice';

export type PlanOptionCardProps = {
  plan: SubscriptionPlan;
  onSelect: (plan: SubscriptionPlan) => void;
};

/** Single row in the plan catalogue: name, price, and a select button. */
export function PlanOptionCard({ plan, onSelect }: PlanOptionCardProps) {
  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.text}>
          <Text style={styles.name}>{plan.name}</Text>
          <Text style={styles.price}>{formatPlanPrice(plan)}</Text>
        </View>
        <Button label="Select" onPress={() => onSelect(plan)} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  text: {
    flex: 1,
  },
  name: {
    ...typography.subtitle,
    color: colors.text,
  },
  price: {
    ...typography.body,
    color: colors.textMuted,
  },
});
