import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../../components/Avatar';
import { colors, spacing, typography } from '../../../core/theme';
import type { ConversationDto } from '../api/messaging.api';

export type ConversationListItemProps = {
  conversation: ConversationDto;
  onPress: (conversationId: string) => void;
};

/**
 * Single row in the inbox list. Purely presentational; navigation is
 * triggered via the onPress callback owned by the screen.
 */
export function ConversationListItem({ conversation, onPress }: ConversationListItemProps) {
  return (
    <View onTouchEnd={() => onPress(conversation.id)} style={styles.row}>
      <Avatar initials={conversation.participantName.charAt(0).toUpperCase()} uri={conversation.participantPhotoUrl} />
      <View style={styles.text}>
        <Text style={styles.name}>{conversation.participantName}</Text>
        <Text style={styles.preview}>{conversation.lastMessagePreview}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  text: {
    flex: 1,
  },
  name: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  preview: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
