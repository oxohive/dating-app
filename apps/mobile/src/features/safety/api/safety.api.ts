import { apiClient } from '../../../core/apiClient';

export type ReportReason = 'inappropriate_content' | 'harassment' | 'fake_profile' | 'other';

export type SubmitReportInput = {
  reportedUserId: string;
  reason: ReportReason;
  details?: string;
};

/**
 * TODO(backend-safety-report): wire up to the backend's safety feature
 * slice once the report-submission endpoint exists
 * (services/backend/safety).
 */
export async function submitReport(input: SubmitReportInput): Promise<{ reportId: string }> {
  return apiClient.post<{ reportId: string }>('/safety/reports', input);
}
