import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../../core/theme';
import type { MessageDto } from '../api/messaging.api';

export type MessageBubbleProps = {
  message: MessageDto;
  isOwnMessage: boolean;
};

/**
 * Single chat bubble. Purely presentational; alignment/color reflect
 * whether the message was sent by the current user.
 */
export function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  return (
    <View style={[styles.row, isOwnMessage ? styles.rowOwn : styles.rowOther]}>
      <View style={[styles.bubble, isOwnMessage ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={isOwnMessage ? styles.textOwn : styles.textOther}>{message.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
  },
  rowOwn: {
    justifyContent: 'flex-end',
  },
  rowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  bubbleOwn: {
    backgroundColor: colors.primary,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
  },
  textOwn: {
    ...typography.body,
    color: '#FFFFFF',
  },
  textOther: {
    ...typography.body,
    color: colors.text,
  },
});
