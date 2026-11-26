import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../../components/Avatar';
import { Card } from '../../../components/Card';
import { colors, spacing, typography } from '../../../core/theme';

export type ProfileCardProps = {
  displayName: string;
  bio: string;
  avatarUri?: string;
};

/**
 * Compact summary card for a profile: avatar, name, bio. Used on the
 * profile screen and anywhere else a profile preview is needed.
 */
export function ProfileCard({ displayName, bio, avatarUri }: ProfileCardProps) {
  return (
    <Card>
      <View style={styles.row}>
        <Avatar initials={displayName.charAt(0).toUpperCase()} uri={avatarUri} />
        <View style={styles.text}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.bio}>{bio}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  text: {
    flex: 1,
  },
  name: {
    ...typography.subtitle,
    color: colors.text,
  },
  bio: {
    ...typography.body,
    color: colors.textMuted,
  },
});
