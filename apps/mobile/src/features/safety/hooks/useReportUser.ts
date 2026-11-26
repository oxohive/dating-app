import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { submitReport, type ReportReason } from '../api/safety.api';

/**
 * Drives the report-user flow: tracks the selected reason/details and
 * submits via safety.api. Used by ReportDialog.
 */
export function useReportUser(reportedProfileId: string) {
  const [reason, setReason] = useState<ReportReason>('other');
  const [details, setDetails] = useState('');

  const mutation = useMutation({
    mutationFn: () => submitReport({ profileId: reportedProfileId, reason, details: details.trim() || undefined }),
  });

  return {
    reason,
    setReason,
    details,
    setDetails,
    isSubmitting: mutation.isPending,
    error: mutation.error,
    submit: mutation.mutateAsync,
  };
}
