import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/Button';
import { colors, radii, spacing, typography } from '../../../core/theme';
import { RADIUS_OPTIONS, formatRadiusLabel, resolveRadiusPickerDisabledReason, type RadiusKm } from '../radius';

export type RadiusPickerProps = {
  selected: RadiusKm;
  onSelect: (radius: RadiusKm) => void;
  isPremium: boolean;
  onPressUpsell: () => void;
  /**
   * True when the user IS Premium but device location permission was
   * denied (or not yet granted), so the picker has nothing to filter
   * against. Distinct from the `!isPremium` upsell state below — see
   * `resolveRadiusPickerDisabledReason` in `radius.ts`. Optional and
   * defaults to `false` so existing call sites that don't track location
   * permission (e.g. `ProfileScreen`) keep compiling unchanged.
   */
  locationPermissionDenied?: boolean;
};

/**
 * Fixed-tier radius selector: 1/3/5/10/25/50/100 km, or "any" — the
 * backend only accepts these exact values, so this is a segmented control,
 * not a free-form slider (see `radius.ts`). Locked in two distinct cases
 * (`resolveRadiusPickerDisabledReason`): a non-Premium user sees every
 * tier but can't select one and is routed to the subscription screens;
 * a Premium user who denied location permission sees a different,
 * non-upsell message instead, since upgrading again wouldn't fix it.
 */
export function RadiusPicker({ selected, onSelect, isPremium, onPressUpsell, locationPermissionDenied = false }: RadiusPickerProps) {
  const disabledReason = resolveRadiusPickerDisabledReason(isPremium, locationPermissionDenied);
  const isLocked = disabledReason !== null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Search radius</Text>
      <View style={styles.row}>
        {RADIUS_OPTIONS.map((radius) => {
          const isSelected = !isLocked && radius === selected;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: isLocked }}
              disabled={isLocked}
              key={radius}
              onPress={() => onSelect(radius)}
              style={[styles.option, isSelected && styles.optionSelected, isLocked && styles.optionLocked]}
            >
              <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{formatRadiusLabel(radius)}</Text>
            </Pressable>
          );
        })}
      </View>
      {disabledReason === 'not_premium' ? (
        <View style={styles.upsell}>
          <Text style={styles.upsellText}>Choosing a search radius is a Premium feature.</Text>
          <Button label="Unlock with Premium" onPress={onPressUpsell} variant="secondary" />
        </View>
      ) : null}
      {disabledReason === 'location_denied' ? (
        <View style={styles.upsell}>
          <Text style={styles.upsellText}>Location permission is required to use the radius picker. Enable it in your device settings.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
  },
  optionSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  optionLocked: {
    opacity: 0.5,
  },
  optionLabel: {
    ...typography.body,
    color: colors.text,
  },
  optionLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  upsell: {
    gap: spacing.xs,
  },
  upsellText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
