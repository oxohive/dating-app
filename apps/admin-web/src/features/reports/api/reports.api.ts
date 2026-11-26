import { apiClient } from "@/lib/apiClient";

export type ReportStatus = "open" | "resolved";

export interface Report {
  id: string;
  reportedProfileId: string;
  reportedUserName: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
}

/**
 * Matches `ReportAdminOut` in
 * services/backend/packages/api/features/admin/schemas.py exactly: id,
 * reporter_profile_id, reported_profile_id, reason, details (nullable),
 * status, created_at. Note there is no denormalized display name for the
 * reported profile - the queue falls back to showing the raw profile id
 * until a future wave joins that in (there's also no GET /admin/users/{id}
 * to look it up client-side yet).
 */
interface AdminReportApiModel {
  id: string;
  reporter_profile_id: string;
  reported_profile_id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  created_at: string;
}

function mapReport(raw: AdminReportApiModel): Report {
  return {
    id: raw.id,
    reportedProfileId: raw.reported_profile_id,
    reportedUserName: raw.reported_profile_id,
    reason: raw.reason,
    details: raw.details,
    status: raw.status,
    createdAt: raw.created_at,
  };
}

/**
 * Lists reports by status ("open" or "resolved" - the only two values the
 * backend's `validate_report_status` accepts).
 * GET /admin/reports?status=open -> 200 list (requires is_admin).
 */
export async function listReports(status: ReportStatus = "open"): Promise<Report[]> {
  const results = await apiClient.get<AdminReportApiModel[]>(`/admin/reports?status=${encodeURIComponent(status)}`);
  return results.map(mapReport);
}

/**
 * Resolves a report with a free-text moderator decision.
 * POST /admin/reports/{id}/resolve {action} -> 200 ReportAdminOut.
 * `action` is 1-64 chars per `ResolveReportRequest`; the queue's UI only
 * offers a single "mark resolved" action for now, so a generic literal is
 * sent and the returned report body is otherwise unused (the hook updates
 * local state instead of round-tripping the response).
 */
export async function resolveReport(reportId: string, action = "resolved by admin"): Promise<void> {
  await apiClient.post<void>(`/admin/reports/${reportId}/resolve`, { action });
}
