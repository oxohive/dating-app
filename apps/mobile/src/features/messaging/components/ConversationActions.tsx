import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/Button';
import { spacing } from '../../../core/theme';
import { BlockButton } from '../../safety/components/BlockButton';

export type ConversationActionsProps = {
  participantProfileId: string;
  onReportPress: () => void;
  onBlocked: () => void;
};

/**
 * Safety actions for the conversation's other participant: block
 * (immediate, with its own confirmation) and report (opens ReportDialog
 * via the parent screen). Single responsibility: compose those two
 * actions as a row above the conversation thread.
 */
export function ConversationActions({ participantProfileId, onReportPress, onBlocked }: ConversationActionsProps) {
  return (
    <View style={styles.row}>
      <Button label="Report" onPress={onReportPress} variant="secondary" />
      <BlockButton blockedProfileId={participantProfileId} onBlocked={onBlocked} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
});
