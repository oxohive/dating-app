import { StyleSheet, Switch, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../../core/theme';
import type { NotificationPreferenceField } from '../preferences';

export type NotificationPreferenceToggleProps = {
  field: NotificationPreferenceField;
  value: boolean;
  onToggle: (key: NotificationPreferenceField['key']) => void;
  disabled?: boolean;
};

/** Single labeled row: a preference's name/description plus its switch. */
export function NotificationPreferenceToggle({ field, value, onToggle, disabled = false }: NotificationPreferenceToggleProps) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.label}>{field.label}</Text>
        <Text style={styles.description}>{field.description}</Text>
      </View>
      <Switch
        accessibilityLabel={field.label}
        disabled={disabled}
        onValueChange={() => onToggle(field.key)}
        thumbColor={value ? colors.primary : undefined}
        trackColor={{ true: colors.primaryMuted, false: colors.border }}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  text: {
    flex: 1,
  },
  label: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  description: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
});
