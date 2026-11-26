import { StyleSheet, TextInput, View } from 'react-native';
import { Button } from '../../../components/Button';
import { colors, spacing } from '../../../core/theme';

export type MessageComposerProps = {
  draft: string;
  onChangeDraft: (value: string) => void;
  onSend: () => void;
};

/**
 * Text input + send button for composing a new message. Single
 * responsibility: capture and submit a draft message.
 */
export function MessageComposer({ draft, onChangeDraft, onSend }: MessageComposerProps) {
  return (
    <View style={styles.row}>
      <TextInput
        accessibilityLabel="Message"
        onChangeText={onChangeDraft}
        placeholder="Type a message"
        style={styles.input}
        value={draft}
      />
      <Button disabled={draft.trim().length === 0} label="Send" onPress={onSend} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
});
