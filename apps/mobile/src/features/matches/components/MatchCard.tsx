import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../../components/Avatar';
import { Card } from '../../../components/Card';
import { colors, spacing, typography } from '../../../core/theme';
import type { MatchDto } from '../api/matches.api';

export type MatchCardProps = {
  match: MatchDto;
};

/**
 * Summary card for a single match. Purely presentational.
 */
export function MatchCard({ match }: MatchCardProps) {
  return (
    <Card>
      <View style={styles.row}>
        <Avatar initials={match.displayName.charAt(0).toUpperCase()} uri={match.photoUrl} />
        <Text style={styles.name}>{match.displayName}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    ...typography.body,
    color: colors.text,
  },
});
