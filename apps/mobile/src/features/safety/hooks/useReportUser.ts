import { useState } from 'react';
import { submitReport, type ReportReason } from '../api/safety.api';

/**
 * Drives the report-user flow: tracks the selected reason/details and
 * submits via safety.api. Used by ReportDialog.
 */
export function useReportUser(reportedUserId: string) {
  const [reason, setReason] = useState<ReportReason>('other');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    setIsSubmitting(true);
    try {
      await submitReport({ reportedUserId, reason, details });
    } finally {
      setIsSubmitting(false);
    }
  }

  return { reason, setReason, details, setDetails, isSubmitting, submit };
}
