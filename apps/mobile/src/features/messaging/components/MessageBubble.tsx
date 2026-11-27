import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../../core/theme';
import type { MessageDto } from '../api/messaging.api';

export type MessageBubbleProps = {
  message: MessageDto;
  isOwnMessage: boolean;
};

/**
 * Single chat bubble. Purely presentational; alignment/color reflect
 * whether the message was sent by the current user. Wrapped in `memo`
 * so that ConversationScreen's per-keystroke re-renders (while composing
 * a reply) don't re-render every row in a long message history — paired
 * with ConversationScreen's `useCallback`-wrapped `renderItem`, which is
 * what makes this memoization actually take effect.
 */
export const MessageBubble = memo(function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  return (
    <View style={[styles.row, isOwnMessage ? styles.rowOwn : styles.rowOther]}>
      <View style={[styles.bubble, isOwnMessage ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={isOwnMessage ? styles.textOwn : styles.textOther}>{message.content}</Text>
      </View>
    </View>
  );
});

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
    color: colors.onPrimary,
  },
  textOther: {
    ...typography.body,
    color: colors.text,
  },
});
