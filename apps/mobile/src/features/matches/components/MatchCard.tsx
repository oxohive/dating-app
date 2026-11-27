import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { Avatar } from '../../../components/Avatar';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { colors, spacing, typography } from '../../../core/theme';
import type { MatchDto } from '../api/matches.api';

export type MatchCardProps = {
  match: MatchDto;
  onPress: (match: MatchDto) => void;
  onUnmatch: (matchId: string) => void;
};

/**
 * Summary row for a single match: tapping it navigates to the
 * conversation; the unmatch button confirms before calling
 * `POST /matches/{id}/unmatch`.
 */
export function MatchCard({ match, onPress, onUnmatch }: MatchCardProps) {
  function handleUnmatchPress() {
    Alert.alert('Unmatch', `Unmatch with ${match.profile.display_name}? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unmatch', style: 'destructive', onPress: () => onUnmatch(match.id) },
    ]);
  }

  return (
    <Card>
      <Pressable
        accessibilityLabel={`Open conversation with ${match.profile.display_name}`}
        accessibilityRole="button"
        onPress={() => onPress(match)}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <Avatar initials={match.profile.display_name.charAt(0).toUpperCase()} uri={match.profile.photo_url ?? undefined} />
        <Text style={styles.name}>{match.profile.display_name}</Text>
      </Pressable>
      <Button label="Unmatch" onPress={handleUnmatchPress} variant="secondary" />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  rowPressed: {
    opacity: 0.6,
  },
  name: {
    ...typography.body,
    color: colors.text,
  },
});
