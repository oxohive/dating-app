import { StyleSheet, Text, TextInput } from 'react-native';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { getApiErrorMessage } from '../../../core/apiErrorMessage';
import { colors, spacing, typography } from '../../../core/theme';
import { useReportUser } from '../hooks/useReportUser';
import { ReportReasonPicker } from './ReportReasonPicker';

export type ReportDialogProps = {
  reportedProfileId: string;
  onSubmitted: () => void;
};

/**
 * Report-a-user dialog. Composes the useReportUser hook with its own
 * minimal markup; intended to be rendered inside a modal/overlay by
 * whichever screen needs it (conversation, etc.), wired to
 * `POST /reports`.
 */
export function ReportDialog({ reportedProfileId, onSubmitted }: ReportDialogProps) {
  const { reason, setReason, details, setDetails, isSubmitting, error, submit } = useReportUser(reportedProfileId);

  async function handleSubmit() {
    await submit();
    onSubmitted();
  }

  return (
    <Card>
      <Text style={styles.title}>Report this user</Text>
      <ReportReasonPicker onChange={setReason} value={reason} />
      <TextInput
        accessibilityLabel="Report details"
        multiline
        onChangeText={setDetails}
        placeholder="What happened? (optional)"
        style={styles.input}
        value={details}
      />
      {error ? <Text style={styles.error}>{getApiErrorMessage(error, 'Something went wrong submitting your report.')}</Text> : null}
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
  error: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
});
