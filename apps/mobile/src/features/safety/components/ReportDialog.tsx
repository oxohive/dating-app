import { StyleSheet, Text, TextInput } from 'react-native';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { colors, spacing, typography } from '../../../core/theme';
import { useReportUser } from '../hooks/useReportUser';

export type ReportDialogProps = {
  reportedUserId: string;
  onSubmitted: () => void;
};

/**
 * Report-a-user dialog. Composes the useReportUser hook with its own
 * minimal markup; intended to be rendered inside a modal/overlay by
 * whichever screen needs it (profile, conversation, etc.).
 */
export function ReportDialog({ reportedUserId, onSubmitted }: ReportDialogProps) {
  const { details, setDetails, isSubmitting, submit } = useReportUser(reportedUserId);

  async function handleSubmit() {
    await submit();
    onSubmitted();
  }

  return (
    <Card>
      <Text style={styles.title}>Report this user</Text>
      <TextInput
        accessibilityLabel="Report details"
        multiline
        onChangeText={setDetails}
        placeholder="What happened?"
        style={styles.input}
        value={details}
      />
      <Button disabled={isSubmitting} label="Submit report" onPress={handleSubmit} />
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.sm,
    ...typography.body,
  },
});
