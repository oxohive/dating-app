import { StyleSheet, Text, View } from 'react-native';
import { Card } from '../../../components/Card';
import { colors, spacing, typography } from '../../../core/theme';
import type { MySubscription } from '../api/subscriptions.api';
import { describeSubscriptionStatus } from '../describeSubscriptionStatus';

export type SubscriptionStatusCardProps = {
  subscription: MySubscription;
};

/** Plan name, status pill and expiry date for the "my subscription" screen. */
export function SubscriptionStatusCard({ subscription }: SubscriptionStatusCardProps) {
  const statusDisplay = describeSubscriptionStatus(subscription.status);

  return (
    <Card>
      <View style={styles.row}>
        <Text style={styles.plan}>{subscription.plan}</Text>
        <Text style={[styles.statusPill, { color: statusDisplay.color }]}>{statusDisplay.label}</Text>
      </View>
      {subscription.expiresAt ? (
        <Text style={styles.expiresAt}>Expires {new Date(subscription.expiresAt).toLocaleDateString()}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  plan: {
    ...typography.subtitle,
    color: colors.text,
    textTransform: 'capitalize',
  },
  statusPill: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  expiresAt: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
