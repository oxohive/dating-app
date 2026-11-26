import { apiClient } from '../../../core/apiClient';

export type ReportReason = 'inappropriate_content' | 'harassment' | 'fake_profile' | 'other';

export type SubmitReportInput = {
  profileId: string;
  reason: ReportReason;
  details?: string;
};

export async function submitReport(input: SubmitReportInput): Promise<void> {
  await apiClient.post<void>('/reports', { profile_id: input.profileId, reason: input.reason, details: input.details });
}

export async function blockProfile(profileId: string): Promise<void> {
  await apiClient.post<void>('/blocks', { profile_id: profileId });
}
