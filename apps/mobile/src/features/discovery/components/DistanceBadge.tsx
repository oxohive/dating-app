import { StyleSheet, Text } from 'react-native';
import { colors, typography } from '../../../core/theme';
import type { DistanceBand } from '../api/discovery.api';

export type DistanceBadgeProps = {
  band: DistanceBand;
};

/**
 * Renders only the backend's approximate distance band (e.g. `<1km`,
 * `1-3km`, ... `100km+`). The backend deliberately never sends raw
 * lat/lng or a precise distance for another user — this component must
 * never attempt to compute or display one client-side, only echo the
 * band string as given.
 */
export function DistanceBadge({ band }: DistanceBadgeProps) {
  return <Text style={styles.text}>{band} away</Text>;
}

const styles = StyleSheet.create({
  text: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
