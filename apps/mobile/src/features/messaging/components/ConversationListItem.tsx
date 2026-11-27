import { Pressable, StyleSheet, Text, View } from 'react-native';
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
    <Pressable
      accessibilityLabel={`Open conversation with ${conversation.participant_display_name}`}
      accessibilityRole="button"
      onPress={() => onPress(conversation.id)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Avatar
        initials={conversation.participant_display_name.charAt(0).toUpperCase()}
        uri={conversation.participant_photo_url ?? undefined}
      />
      <View style={styles.text}>
        <Text style={styles.name}>{conversation.participant_display_name}</Text>
        <Text style={styles.preview}>{conversation.last_message_preview ?? 'Say hello!'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  rowPressed: {
    opacity: 0.6,
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
